"""Objective companions to the visual score: height, storeys, footprint IoU, roof form.
usage: python -I scripts/benchmark/metrics.py <case> [...] -> prints JSON rows"""
import sys, json, math
from shapely.geometry import shape, Polygon
from shapely.ops import unary_union
import os
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
WORK = os.environ.get('MBG_BENCH_WORK', os.path.join(ROOT, 'output', 'benchmark'))
APP_URL = os.environ.get('MBG_APP_URL', 'http://127.0.0.1:8153/app.html')
cases = json.load(open(os.path.join(HERE, 'cases.json')))
rows = []
for name in sys.argv[1:]:
    case = cases[name]; ref = json.load(open(f'{WORK}/refs/{name}/summary.json'))
    g = json.load(open(f'{WORK}/gen/{name}/building-styled.geojson'))
    ground = case['ground']
    ring = ref['footprint']['coordinates'][0][:-1]
    mx = sum(p[0] for p in ring) / len(ring); my = sum(p[1] for p in ring) / len(ring)
    lng0, lat0 = case['site']; kx = 111320 * math.cos(math.radians(lat0)); ky = 110540
    local = lambda c: ((c[0] - lng0) * kx, (c[1] - lat0) * ky)
    ref_fp = Polygon([(x - mx, y - my) for x, y in ring])
    ground_parts = []
    for f in g['features']:
        p = f['properties']
        if p.get('mbg_layer') in ('core', 'podium', 'windows', 'podiumGlass') and float(p.get('b', 9)) < 1.0:
            geom = f['geometry']
            polys = [geom['coordinates']] if geom['type'] == 'Polygon' else geom['coordinates']
            for pc in polys:
                try:
                    ground_parts.append(Polygon([local(c) for c in pc[0]]).buffer(0.2))
                except Exception:
                    pass
    gen_fp = Polygon(unary_union(ground_parts).buffer(-0.2).convex_hull.exterior) if ground_parts else None
    gen_fp_exact = unary_union(ground_parts).buffer(0.25).buffer(-0.45) if ground_parts else None
    inter = gen_fp_exact.intersection(ref_fp).area if gen_fp_exact else 0
    union = gen_fp_exact.union(ref_fp).area if gen_fp_exact else ref_fp.area
    asset = g['mbg_export']['asset']
    gen_h = max(float(f['properties']['h']) for f in g['features'])
    ref_h = ref['zmax'] - ground
    ref_storeys = len([s for s in ref['storeys'] if s['worldZ'] is not None and s['worldZ'] >= ground - 0.3 and s['worldZ'] < ref['zmax'] - 2.0])
    gen_storeys = len([l for l in asset['levels'] if l['zone'] != 'roof'])
    roof = case['refine'].get('roofProfile', 'standard')
    gen_pitched = roof in ('gable', 'hip', 'mansard', 'vault')
    rows.append({'case': name, 'refHeight': round(ref_h, 2), 'genHeight': round(gen_h, 2), 'heightErrorPct': round(100 * (gen_h - ref_h) / ref_h, 1),
                 'refStoreys': ref_storeys, 'genStoreys': gen_storeys, 'footprintIoU': round(inter / union, 3),
                 'refPitched': ref['pitchedRoof'], 'genRoof': roof, 'roofFormMatch': ref['pitchedRoof'] == gen_pitched,
                 'components': asset['summary']['components'], 'refinements': len(case['refine']), 'preset': case['preset']})
print(json.dumps(rows, indent=1))
