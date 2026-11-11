"""Summarise a reference IFC: storeys, element classes, footprint, heights, roof, glazing, colours, georef.
usage: python -I extract_ref.py <model.ifc> <out.json> <out.glb>"""
import sys, json, math, collections
import numpy as np
import ifcopenshell, ifcopenshell.geom, ifcopenshell.util.element as uel, ifcopenshell.util.placement, ifcopenshell.util.unit
from shapely.geometry import Polygon, mapping
from shapely.ops import unary_union
import trimesh

src, out_json, out_glb = sys.argv[1], sys.argv[2], sys.argv[3]
# optional: --fp-classes A,B --close metres (layered walls that only close with their openings)
FP_CLASSES = sys.argv[sys.argv.index('--fp-classes') + 1].split(',') if '--fp-classes' in sys.argv else ['IfcWall','IfcWallStandardCase','IfcCurtainWall','IfcColumn']
CLOSE = float(sys.argv[sys.argv.index('--close') + 1]) if '--close' in sys.argv else 0.5
f = ifcopenshell.open(src)
CLASSES = ['IfcWall','IfcWallStandardCase','IfcCurtainWall','IfcWindow','IfcDoor','IfcSlab','IfcRoof','IfcColumn','IfcBeam','IfcRailing','IfcStair','IfcStairFlight','IfcPlate','IfcMember','IfcCovering','IfcBuildingElementProxy','IfcFooting','IfcRamp']
counts = {c: len(f.by_type(c, include_subtypes=False)) for c in CLASSES}
storeys = []
scale = ifcopenshell.util.unit.calculate_unit_scale(f)
for s in f.by_type('IfcBuildingStorey'):
    m = ifcopenshell.util.placement.get_local_placement(s.ObjectPlacement) if s.ObjectPlacement else None
    storeys.append({'name': s.Name, 'elevation': float(s.Elevation) * scale if s.Elevation is not None else None,
                    'worldZ': float(m[2][3]) * scale if m is not None else None})
storeys.sort(key=lambda s: s['elevation'] if s['elevation'] is not None else 0)
site = (f.by_type('IfcSite') or [None])[0]
def dms(v):
    if not v: return None
    sign = -1 if any(x < 0 for x in v) else 1
    parts = [abs(x) for x in v] + [0, 0, 0, 0]
    return sign * (parts[0] + parts[1]/60 + parts[2]/3600 + parts[3]/3.6e9)
georef = {
    'lat': dms(site.RefLatitude) if site else None,
    'lng': dms(site.RefLongitude) if site else None,
    'elevation': float(site.RefElevation) if site and site.RefElevation is not None else None,
    'mapConversion': bool(f.schema != 'IFC2X3' and f.by_type('IfcMapConversion')),
}
units = [u.Name for u in f.by_type('IfcSIUnit') if u.UnitType == 'LENGTHUNIT']
settings = ifcopenshell.geom.settings()
settings.set('use-world-coords', True)
ENVELOPE = {'IfcWall','IfcWallStandardCase','IfcCurtainWall','IfcWindow','IfcDoor','IfcSlab','IfcRoof','IfcColumn','IfcRailing','IfcPlate','IfcMember','IfcCovering','IfcBeam','IfcStair','IfcStairFlight','IfcBuildingElementProxy','IfcRamp'}
products = [p for p in f.by_type('IfcProduct') if p.is_a() in ENVELOPE and p.Representation]
import multiprocessing as _mp
it = ifcopenshell.geom.iterator(settings, f, _mp.cpu_count(), include=products)
meshes = []
proj = collections.defaultdict(list)
classArea = collections.Counter()
colourArea = collections.defaultdict(collections.Counter)
allz = []
if it.initialize():
    while True:
        shape = it.get()
        el = f.by_id(shape.id)
        cls = el.is_a()
        g = shape.geometry
        v = np.array(g.verts).reshape(-1, 3)
        faces = np.array(g.faces).reshape(-1, 3)
        if len(faces):
            mats = g.materials
            mids = np.array(g.material_ids) if len(g.material_ids) else np.zeros(len(faces), int)
            cols = np.zeros((len(faces), 4))
            for i, m in enumerate(mats):
                d = m.diffuse
                rgb = [d.r(), d.g(), d.b()] if hasattr(d, 'r') else list(d)[:3]
                a = 1 - (m.transparency if m.transparency == m.transparency else 0)
                cols[mids == i] = rgb + [a]
            cols[mids < 0] = [0.7, 0.7, 0.7, 1]
            tm = trimesh.Trimesh(vertices=v, faces=faces, process=False)
            tm.visual.face_colors = (cols * 255).astype(np.uint8)
            tm.metadata['ifc_class'] = cls
            meshes.append((cls, el.GlobalId, tm))
            allz.append(v[:, 2])
            areas = tm.area_faces
            classArea[cls] += float(areas.sum())
            for (r, gg, b, a), ar in zip(cols, areas):
                colourArea[cls]['#%02x%02x%02x' % (int(r*255), int(gg*255), int(b*255))] += float(ar)
            tri2 = v[faces][:, :, :2]
            proj[cls].append((float(v[:, 2].min()), tri2))
        if not it.next():
            break
z = np.concatenate(allz) if allz else np.zeros(1)
zmin, zmax = float(np.percentile(z, 0.1)), float(z.max())
def outline(classes, zlimit=None):
    polys = []
    for c in classes:
        for zlow, tris in proj.get(c, []):
            if zlimit is not None and zlow > zlimit: continue
            for t in tris:
                p = Polygon(t)
                if p.is_valid and p.area > 1e-4: polys.append(p)
    if not polys: return None
    # close wall joints, then keep the outer outline: rooms are not courtyards
    u = unary_union(polys).buffer(CLOSE, join_style=2).buffer(-CLOSE, join_style=2)
    parts = list(u.geoms) if u.geom_type == 'MultiPolygon' else [u]
    parts = [Polygon(p.exterior) for p in parts if p.area > 4]
    u = unary_union(parts)
    if u.geom_type == 'MultiPolygon':
        u = max(u.geoms, key=lambda g: g.area)
    return Polygon(u.exterior).simplify(0.25)
# walls, openings and columns only: ground slabs run out under terraces and patios
fp = outline(FP_CLASSES, zmin + 3.5)
envelope = outline(list(ENVELOPE))
roof_tris = [t for c in ('IfcRoof','IfcSlab','IfcCovering') for _, tris in proj.get(c, []) for t in tris]
def is_roof(el):
    if el.is_a('IfcRoof'): return True
    if el.is_a('IfcSlab') and getattr(el, 'PredefinedType', None) == 'ROOF': return True
    parent = uel.get_aggregate(el)
    return bool(parent and parent.is_a('IfcRoof'))
roof_ids = {e.GlobalId for e in f.by_type('IfcProduct') if is_roof(e)}
sloped = flat = 0.0
for cls, gid, tm in meshes:
    if gid not in roof_ids: continue
    nz = np.abs(tm.face_normals[:, 2]); ar = tm.area_faces
    sloped += float(ar[(nz > 0.2) & (nz < 0.96)].sum()); flat += float(ar[nz >= 0.96].sum())
pitched = sloped > 0.35 * max(1e-6, sloped + flat)
glazed = classArea['IfcWindow'] + classArea['IfcCurtainWall'] + classArea['IfcPlate']
opaque = classArea['IfcWall'] + classArea['IfcWallStandardCase']
dominant = {c: [k for k, _ in colourArea[c].most_common(3)] for c in colourArea}
summary = {
    'source': src.split('/')[-1], 'schema': f.schema, 'units': units, 'counts': counts,
    'storeys': storeys, 'georef': georef,
    'zmin': zmin, 'zmax': zmax, 'height': zmax - zmin,
    'footprint': mapping(fp) if fp else None, 'footprintArea': fp.area if fp else None,
    'envelopeArea': envelope.area if envelope else None,
    'footprintBounds': fp.bounds if fp else None,
    'pitchedRoof': pitched, 'roofSlopedFraction': sloped / max(1e-6, sloped + flat),
    'glazingToWallSurfaceRatio': glazed / max(1e-6, glazed + opaque),
    'dominantColours': dominant,
}
json.dump(summary, open(out_json, 'w'), indent=1, default=float)
scene = trimesh.Scene()
for cls, gid, tm in meshes:
    scene.add_geometry(tm, node_name=f'{cls}:{gid}')
scene.export(out_glb)
print(json.dumps({k: summary[k] for k in ['source','schema','height','footprintArea','pitchedRoof','glazingToWallSurfaceRatio']}, default=float), len(storeys), 'storeys', len(meshes), 'meshes')
