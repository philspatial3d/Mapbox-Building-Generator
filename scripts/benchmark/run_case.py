"""Generate one benchmark case through the real app and compare it with its reference.
usage: run_case.py <case> [<case> ...]   (cases from bench/cases.json)"""
import sys, json, os, math, subprocess, base64
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
WORK = os.environ.get('MBG_BENCH_WORK', os.path.join(ROOT, 'output', 'benchmark'))
APP_URL = os.environ.get('MBG_APP_URL', 'http://127.0.0.1:8153/app.html')
S = WORK
APP = ROOT
PY = sys.executable
cases = json.load(open(os.path.join(HERE, 'cases.json')))
library = {p['name']: p for p in json.load(open(f'{APP}/presets/defaults.json'))['presets']}
for f in os.listdir(f'{APP}/presets/famous'):
    p = json.load(open(f'{APP}/presets/famous/{f}')); library[p['name']] = p
VIEWS = 'se,nw,s,e'
for name in sys.argv[1:]:
    case = cases[name]
    ref = json.load(open(f'{S}/refs/{name}/summary.json'))
    ground = case['ground']
    ring = ref['footprint']['coordinates'][0][:-1]
    mx_ = sum(p[0] for p in ring) / len(ring); my_ = sum(p[1] for p in ring) / len(ring)   # vertex mean = turf.centroid
    lng0, lat0 = case['site']
    kx = 111320 * math.cos(math.radians(lat0)); ky = 110540
    coords = [[lng0 + (x - mx_) / kx, lat0 + (y - my_) / ky] for x, y in ring] 
    coords.append(coords[0])
    out = f'{WORK}/gen/{name}'; os.makedirs(out, exist_ok=True)
    json.dump({'type': 'FeatureCollection', 'features': [{'type': 'Feature', 'properties': {'source': f'{name} reference footprint (IFC ground-level outline)'}, 'geometry': {'type': 'Polygon', 'coordinates': [coords]}}]}, open(f'{out}/footprint.geojson', 'w'))
    base = library[case['preset']]
    cfg = {**base['config'], **case.get('refine', {})}
    json.dump({'schema': 1, 'name': f'Benchmark: {name}', 'config': cfg}, open(f'{out}/preset.json', 'w'), indent=1)
    r = subprocess.run([PY, os.path.join(HERE, 'exporttest.py'), f'{out}/preset.json', f'{out}/footprint.geojson', out], capture_output=True, text=True)
    print(name, r.stdout.strip()[-400:], r.stderr.strip()[-300:])
    R = max(ref['footprintBounds'][2] - ref['footprintBounds'][0], ref['footprintBounds'][3] - ref['footprintBounds'][1], ref['zmax'] - ground)
    rel = os.path.relpath(out, S)
    subprocess.run([PY, os.path.join(HERE, 'shoot.py'), f'refs/{name}/reference.glb', f'{out}/ref', VIEWS, f'&zup=1&gy={ground}&cx={mx_}&cz={-my_}&r={R}'], capture_output=True)
    subprocess.run([PY, os.path.join(HERE, 'shoot.py'), f'{rel}/building.glb', f'{out}/gen', VIEWS, f'&gy=0&cx=0&cz=0&r={R}'], capture_output=True)
    from PIL import Image, ImageDraw
    W, H = 420, 327
    sheet = Image.new('RGB', (W * 4, (H + 16) * 2), 'white'); d = ImageDraw.Draw(sheet)
    for row, who in enumerate(['ref', 'gen']):
        for c, v in enumerate(VIEWS.split(',')):
            sheet.paste(Image.open(f'{out}/{who}-{v}.png').convert('RGB').resize((W, H)), (c * W, row * (H + 16) + 16))
        d.text((4, row * (H + 16) + 2), f"{name} - {'reference (IFC)' if who == 'ref' else 'generated: ' + case['preset']}", fill='black')
    sheet.save(f'{out}/compare.jpg', quality=84)
