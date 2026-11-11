"""Validate exported IFC files with IfcOpenShell, independently of the generator.

For each file: schema validation (express rules and types), geometry for every element,
storey containment, the MBG property sets, and the georeferencing read back to longitude
and latitude. Optionally writes a GLB of the IfcOpenShell geometry for visual inspection.

usage: python validate_ifc.py <file.ifc> [more.ifc ...] [--glb-dir DIR] [--json report.json]
needs: pip install ifcopenshell numpy (trimesh for --glb-dir)
"""
import json
import math
import sys
import logging
import multiprocessing

import ifcopenshell
import ifcopenshell.geom
import ifcopenshell.validate
import ifcopenshell.util.element as uel


def utm_to_lnglat(e, n, zone, south):
    """Inverse transverse Mercator (WGS84), enough to check the map conversion."""
    a, f, k0 = 6378137.0, 1 / 298.257223563, 0.9996
    e2 = f * (2 - f)
    ep2 = e2 / (1 - e2)
    x = e - 500000.0
    y = n - (10000000.0 if south else 0.0)
    m = y / k0
    mu = m / (a * (1 - e2 / 4 - 3 * e2 ** 2 / 64 - 5 * e2 ** 3 / 256))
    e1 = (1 - math.sqrt(1 - e2)) / (1 + math.sqrt(1 - e2))
    phi1 = (mu + (3 * e1 / 2 - 27 * e1 ** 3 / 32) * math.sin(2 * mu) + (21 * e1 ** 2 / 16 - 55 * e1 ** 4 / 32) * math.sin(4 * mu)
            + (151 * e1 ** 3 / 96) * math.sin(6 * mu))
    n1 = a / math.sqrt(1 - e2 * math.sin(phi1) ** 2)
    t1 = math.tan(phi1) ** 2
    c1 = ep2 * math.cos(phi1) ** 2
    r1 = a * (1 - e2) / (1 - e2 * math.sin(phi1) ** 2) ** 1.5
    d = x / (n1 * k0)
    lat = phi1 - (n1 * math.tan(phi1) / r1) * (d ** 2 / 2 - (5 + 3 * t1 + 10 * c1 - 4 * c1 ** 2 - 9 * ep2) * d ** 4 / 24)
    lng = (d - (1 + 2 * t1 + c1) * d ** 3 / 6) / math.cos(phi1)
    return math.degrees(lng) + (zone - 1) * 6 - 180 + 3, math.degrees(lat)


def check(path, glb_dir=None):
    report = {'file': path.split('/')[-1], 'ok': True, 'notes': []}
    f = ifcopenshell.open(path)
    report['schema'] = f.schema

    class Collect(logging.Handler):
        def __init__(self):
            super().__init__()
            self.records = []

        def emit(self, record):
            self.records.append(record.getMessage())

    log = logging.getLogger('mbg-validate')
    log.handlers = []
    collector = Collect()
    log.addHandler(collector)
    log.setLevel(logging.INFO)
    ifcopenshell.validate.validate(f, log, express_rules=True)
    report['schemaIssues'] = len(collector.records)
    report['schemaIssueSamples'] = collector.records[:5]
    if collector.records:
        report['ok'] = False

    elements = f.by_type('IfcElement')
    report['elements'] = len(elements)
    by_class = {}
    for el in elements:
        by_class[el.is_a()] = by_class.get(el.is_a(), 0) + 1
    report['byClass'] = by_class
    uncontained = [el for el in elements if not uel.get_container(el)]
    report['uncontained'] = len(uncontained)
    without_pset = [el for el in elements if 'Pset_MBG_Component' not in uel.get_psets(el)]
    report['withoutMbgPset'] = len(without_pset)
    if uncontained or without_pset:
        report['ok'] = False

    settings = ifcopenshell.geom.settings()
    settings.set('use-world-coords', True)
    it = ifcopenshell.geom.iterator(settings, f, multiprocessing.cpu_count(), include=elements)
    shapes, meshes = 0, []
    zmin, zmax = float('inf'), float('-inf')
    if it.initialize():
        while True:
            shape = it.get()
            shapes += 1
            verts = shape.geometry.verts
            zs = verts[2::3]
            if zs:
                zmin, zmax = min(zmin, min(zs)), max(zmax, max(zs))
            if glb_dir is not None:
                meshes.append(shape)
            if not it.next():
                break
    report['geometryBuilt'] = shapes
    report['geometryFailed'] = len(elements) - shapes
    report['heightRange'] = [zmin, zmax]
    if shapes < len(elements):
        report['ok'] = False

    storeys = sorted(f.by_type('IfcBuildingStorey'), key=lambda s: s.Elevation or 0)
    report['storeys'] = len(storeys)
    conv = f.by_type('IfcMapConversion')
    if conv:
        c = conv[0]
        crs = c.TargetCRS
        zone = int(''.join(ch for ch in crs.MapZone if ch.isdigit()))
        lng, lat = utm_to_lnglat(c.Eastings, c.Northings, zone, crs.MapZone.endswith('S'))
        site = f.by_type('IfcSite')[0]
        def dms(v):
            sign = -1 if any(x < 0 for x in v) else 1
            a = [abs(x) for x in v] + [0, 0, 0, 0]
            return sign * (a[0] + a[1] / 60 + a[2] / 3600 + a[3] / 3.6e9)
        site_lng, site_lat = dms(site.RefLongitude), dms(site.RefLatitude)
        err = math.hypot((lng - site_lng) * 111320 * math.cos(math.radians(lat)), (lat - site_lat) * 110540)
        report['georef'] = {'crs': crs.Name, 'mapConversionLngLat': [lng, lat], 'siteLngLat': [site_lng, site_lat], 'agreementM': err,
                            'xAxis': [c.XAxisAbscissa, c.XAxisOrdinate]}
        if err > 1.0:
            report['ok'] = False
            report['notes'].append('IfcMapConversion and IfcSite reference disagree by more than 1 m')
    else:
        report['ok'] = False
        report['notes'].append('no IfcMapConversion')
    building = f.by_type('IfcBuilding')[0]
    prov = uel.get_psets(building).get('Pset_MBG_Provenance', {})
    report['provenance'] = {k: prov.get(k) for k in ('SourceType', 'SourceFootprintArea', 'InferredHeight', 'InferredStoreys', 'EntranceBasis')}
    if not prov:
        report['ok'] = False

    if glb_dir is not None and meshes:
        import numpy as np
        import trimesh
        scene = trimesh.Scene()
        for shape in meshes:
            g = shape.geometry
            v = np.array(g.verts).reshape(-1, 3)
            fc = np.array(g.faces).reshape(-1, 3)
            if not len(fc):
                continue
            tm = trimesh.Trimesh(vertices=v, faces=fc, process=False)
            mats = g.materials
            if mats:
                d = mats[0].diffuse
                rgb = [d.r(), d.g(), d.b()] if hasattr(d, 'r') else list(d)[:3]
                tm.visual.face_colors = [int(x * 255) for x in rgb] + [255]
            scene.add_geometry(tm)
        out = f"{glb_dir}/{report['file'].replace('.ifc', '')}.ifcopenshell.glb"
        scene.export(out)
        report['glb'] = out
    return report


if __name__ == '__main__':
    args = sys.argv[1:]
    glb_dir = args[args.index('--glb-dir') + 1] if '--glb-dir' in args else None
    json_out = args[args.index('--json') + 1] if '--json' in args else None
    files = [a for i, a in enumerate(args) if a.endswith('.ifc') and (i == 0 or args[i - 1] not in ('--glb-dir', '--json'))]
    reports = [check(p, glb_dir) for p in files]
    for r in reports:
        geo = r.get('georef', {})
        print(f"{'OK  ' if r['ok'] else 'FAIL'} {r['file']}: {r['schema']}, {r['elements']} elements, geometry {r['geometryBuilt']}/{r['elements']}, "
              f"schema issues {r['schemaIssues']}, uncontained {r['uncontained']}, storeys {r['storeys']}, georef agreement {geo.get('agreementM', float('nan')):.3f} m")
        for s in r['schemaIssueSamples']:
            print('     ', s[:200])
        for n in r['notes']:
            print('     ', n)
    if json_out:
        json.dump(reports, open(json_out, 'w'), indent=1, default=str)
    sys.exit(0 if all(r['ok'] for r in reports) else 1)
