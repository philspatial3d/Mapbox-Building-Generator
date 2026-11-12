"""Architectural quality evidence for the cases in cases.json, through the real app.

For each case, in a fresh browser profile (no saved session):
  1. select the library preset (or none: first-use defaults),
  2. upload the footprint GeoJSON,
  3. export GLB, IFC4 and GeoJSON with the real buttons,
  4. screenshot the Mapbox view from three matched cameras (street, oblique, roof),
  5. render the exported GLB in scripts/quality/viewer.html, an independent three.js viewer,
     from matched street, entrance, facade, oblique and roof cameras.
The street camera faces the generated entrance (read from the exported GeoJSON). Mapped
context buildings standing on the uploaded lot are hidden for the screenshots only.
Writes <out>/<case>/{map,glb}-<view>.jpg, the exports, and <out>/<case>/case.json
(settings, counts, timings, console errors).

usage: python scripts/quality/capture.py <app url> <out dir> [case id ...]
env:   MBG_VIEWPORT=WxH (default 1440x900), MBG_PHONE=1 (390x844 touch, map + exports only)
needs: pip install playwright && playwright install chromium; the app served locally from
       the repo root, and <out dir> inside the served root (the viewer loads the GLB by URL).
"""
import base64
import json
import math
import os
import shutil
import sys
import tempfile
import time

from playwright.sync_api import sync_playwright

APP, OUT = sys.argv[1], os.path.abspath(sys.argv[2])
WANTED = sys.argv[3:]
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
SERVED_ROOT = os.environ.get('MBG_SERVED_ROOT', ROOT)
SPEC = json.load(open(os.path.join(HERE, 'cases.json')))
PHONE = os.environ.get('MBG_PHONE') == '1'
VW, VH = map(int, os.environ.get('MBG_VIEWPORT', '390x844' if PHONE else '1440x900').split('x'))
BASE = APP.rsplit('/', 1)[0]
KX = 111320 * math.cos(math.radians(SPEC['site']['lat']))
KY = 110540


def ring_xy(ring):
    return [((lng - SPEC['site']['lng']) * KX, (lat - SPEC['site']['lat']) * KY) for lng, lat in ring]


def entrance_bearing(geojson, footprint):
    """Compass bearing from the footprint centre to the generated entrance, or None."""
    outer = footprint['features'][0]['geometry']['coordinates'][0]
    pts = ring_xy(outer[:-1])
    cx, cy = sum(p[0] for p in pts) / len(pts), sum(p[1] for p in pts) / len(pts)
    doors = []
    for f in geojson.get('features', []):
        p = f.get('properties') or {}
        label = ' '.join(str(p.get(k, '')) for k in ('part', 'mbg_part', 'mbg_name', 'layer', 'mbg_layer'))
        if not any(w in label.lower() for w in ('door', 'entrance_header', 'entrance_canopy', 'front_door')):
            continue
        g = f['geometry']
        polys = [g['coordinates']] if g['type'] == 'Polygon' else g['coordinates']
        for poly in polys:
            doors += ring_xy(poly[0])
    if not doors:
        return None, (cx, cy)
    dx = sum(p[0] for p in doors) / len(doors) - cx
    dy = sum(p[1] for p in doors) / len(doors) - cy
    # snap to the footprint edge normal the entrance sits on
    best = None
    for (x0, y0), (x1, y1) in zip(pts, pts[1:] + pts[:1]):
        ex, ey = x1 - x0, y1 - y0
        ln = math.hypot(ex, ey)
        if ln < 2:
            continue
        nx, ny = ey / ln, -ex / ln
        if nx * ((x0 + x1) / 2 - cx) + ny * ((y0 + y1) / 2 - cy) < 0:
            nx, ny = -nx, -ny
        mx, my = sum(p[0] for p in doors) / len(doors), sum(p[1] for p in doors) / len(doors)
        t = max(0, min(1, ((mx - x0) * ex + (my - y0) * ey) / (ln * ln)))
        d = math.hypot(mx - (x0 + t * ex), my - (y0 + t * ey))
        if best is None or d < best[0]:
            best = (d, nx, ny)
    if best and best[0] < 12:
        dx, dy = best[1], best[2]
    return (math.degrees(math.atan2(dx, dy)) + 360) % 360, (cx, cy)


MAP_VIEW = """async ([lng, lat, zoom, pitch, bearing, padTop]) => {
  const m = window.__map;
  m.jumpTo({ center: [lng, lat], zoom, pitch, bearing, padding: { top: padTop || 0, bottom: 0, left: 0, right: 0 } });
  await new Promise(r => { const done = () => (m.loaded() && !m.isMoving()) ? r() : setTimeout(done, 150); setTimeout(done, 400); });
  await new Promise(r => setTimeout(r, 900));
}"""

HIDE_LOT_CONTEXT = """(ring) => {
  const m = window.__map;
  if (!m.getLayer('ctx-3d-buildings')) return 0;
  /* clear precinct: mapped buildings whose extent comes within 30 m of the lot */
  const [w, s, e, n] = turf.bbox(turf.buffer(turf.polygon([ring]), 0.03, { units: 'kilometers' }));
  const ids = new Set();
  m.querySourceFeatures('composite', { sourceLayer: 'building' }).forEach(f => {
    if (f.id == null) return;
    try { const b = turf.bbox(f); if (b[0] <= e && b[2] >= w && b[1] <= n && b[3] >= s) ids.add(f.id); } catch (err) {}
  });
  if (ids.size) m.setFilter('ctx-3d-buildings', ['all', ['==', 'extrude', 'true'], ['!in', '$id', ...ids]]);
  return ids.size;
}"""

HIDE_UI = """() => { const s = document.createElement('style'); s.id = 'q-hide';
  s.textContent = 'body > *:not(#map){visibility:hidden !important} #map .mapboxgl-control-container{display:none !important}';
  document.head.appendChild(s); }"""


def run_case(p, case):
    out = os.path.join(OUT, case['id'])
    os.makedirs(out, exist_ok=True)
    footprint_path = os.path.join(HERE, 'footprints', case['footprint'])
    footprint = json.load(open(footprint_path))
    user_dir = tempfile.mkdtemp(prefix='mbg-quality-')
    ctx = p.chromium.launch_persistent_context(
        user_dir, headless=True, accept_downloads=True,
        args=['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'],
        viewport={'width': VW, 'height': VH}, has_touch=PHONE, is_mobile=PHONE,
        device_scale_factor=3 if PHONE else 1)
    page = ctx.new_page()
    errors = []
    page.on('pageerror', lambda e: errors.append('pageerror: ' + str(e)[:300]))
    page.on('console', lambda m: m.type == 'error' and errors.append('console: ' + m.text[:300]))
    page.on('dialog', lambda d: (errors.append('dialog: ' + d.message), d.dismiss()))
    page.goto(f'{APP}?debug=1')
    page.wait_for_function(
        "window.__map && window.__map.loaded() && document.querySelectorAll('#presetSelect option').length>5",
        timeout=240000)
    time.sleep(1)
    record = {'id': case['id'], 'covers': case['covers'], 'footprint': case['footprint'], 'preset': case['preset'],
              'viewport': [VW, VH], 'phone': PHONE, 'app': APP}
    if case['preset']:
        options = page.evaluate("()=>[...document.querySelectorAll('#presetSelect option')].map(o=>[o.value,o.text])")
        value = next((v for v, t in options if t == case['preset']), None)
        if not value:
            raise SystemExit(f"preset not found: {case['preset']}")
        page.select_option('#presetSelect', value)
        time.sleep(1)
    page.evaluate("()=>{document.getElementById('openAR').disabled=true}")
    t0 = time.time()
    page.set_input_files('#geoUpload', footprint_path)
    page.wait_for_function("!document.getElementById('openAR').disabled", timeout=300000)
    record['uploadToReadySeconds'] = round(time.time() - t0, 2)
    time.sleep(1.5)

    if PHONE and page.evaluate("()=>!!document.getElementById('controlsToggle') && getComputedStyle(document.getElementById('controlsToggle')).display !== 'none'"):
        page.click('#controlsToggle')
        time.sleep(0.6)
        page.screenshot(path=os.path.join(out, 'phone-controls.jpg'), type='jpeg', quality=80)
    exports = {}
    for fmt, button in [('glb', '#download3D'), ('ifc', '#download3D'), ('geojson', '#downloadGeo')]:
        if fmt != 'geojson':
            page.select_option('#export3dFormat', fmt)
        t1 = time.time()
        with page.expect_download(timeout=300000) as dl:
            page.evaluate(f"()=>document.querySelector('{button}').click()")
        path = os.path.join(out, f'building.{fmt}')
        dl.value.save_as(path)
        exports[fmt] = {'bytes': os.path.getsize(path), 'seconds': round(time.time() - t1, 2)}
    record['exports'] = exports
    generated = json.load(open(os.path.join(out, 'building.geojson')))
    feats = generated.get('features', [])
    record['features'] = len(feats)
    tops = [float((f.get('properties') or {}).get('height', (f.get('properties') or {}).get('h', 0)) or 0) for f in feats]
    record['heightM'] = round(max(tops), 2) if tops else None
    bearing, (cx, cy) = entrance_bearing(generated, footprint)
    record['entranceBearing'] = None if bearing is None else round(bearing, 1)
    slab = [float(f['properties'].get('base_height', f['properties'].get('b', 0)) or 0) for f in feats
            if 'main_roof_slab' in ' '.join(str(v) for v in (f.get('properties') or {}).values())]
    record['mainRoofM'] = round(max(slab), 2) if slab else None
    az = bearing if bearing is not None else float(SPEC['site'].get('frontBearing', 180))
    record['streetCameraAzimuth'] = round(az, 1)
    record['layers'] = page.evaluate(
        "()=>window.__map.getStyle().layers.filter(l => l.type === 'fill-extrusion' && /-col$/.test(l.id)).length")
    record['config'] = page.evaluate("()=>window.__mbgLastConfig ? window.__mbgLastConfig() : null")
    record['settings'] = page.evaluate("""()=>{const o={}; document.querySelectorAll('#controls input, #controls select, .controls input, .controls select').forEach(el=>{ if(!el.id) return; o[el.id] = el.type==='checkbox' ? el.checked : el.value; }); return o;}""")

    # ---- Mapbox views (matched cameras) ----
    if PHONE and page.evaluate("()=>document.body.classList.contains('controls-open')"):
        page.click('#controlsClose')
        time.sleep(0.4)
    ring = footprint['features'][0]['geometry']['coordinates'][0]
    page.evaluate(MAP_VIEW, [SPEC['site']['lng'], SPEC['site']['lat'], 16.5, 0, 0])
    record['contextHidden'] = page.evaluate(HIDE_LOT_CONTEXT, ring)
    page.evaluate(HIDE_UI)
    clng = SPEC['site']['lng'] + cx / KX
    clat = SPEC['site']['lat'] + cy / KY
    height = record['heightM'] or 40
    rad = math.radians(az)
    # street: centre on the entrance face, camera across the street looking back at it
    xs = [p[0] for p in ring_xy(ring)]
    ys = [p[1] for p in ring_xy(ring)]
    half = abs(math.sin(rad)) * (max(xs) - min(xs)) / 2 + abs(math.cos(rad)) * (max(ys) - min(ys)) / 2
    face = (clng + math.sin(rad) * half / KX, clat + math.cos(rad) * half / KY)
    look = (az + 180) % 360
    scale = math.log2(max(height, 25) / 70)
    pad = round(VH * 0.42)
    views = {
        'street': [face[0], face[1], 20.2, 80, look, round(VH * 0.36)],
        'oblique': [clng, clat, max(16.6, min(19.4, 18.55 - scale)), 62, (look + 38) % 360, pad],
        'roof': [clng, clat, max(17.6, min(19.4, 19.0 - scale * 0.7)), 30, (look + 25) % 360, round(VH * 0.2)],
    }
    for name, v in views.items():
        page.evaluate(MAP_VIEW, v)
        page.screenshot(path=os.path.join(out, f'map-{name}.jpg'), type='jpeg', quality=90)
    record['mapViews'] = views

    # ---- independent viewer ----
    if not PHONE:
        rel = '/' + os.path.relpath(os.path.join(out, 'building.glb'), SERVED_ROOT)
        vpage = ctx.new_page()
        verrs = []
        vpage.on('pageerror', lambda e: verrs.append(str(e)[:300]))
        rise = max(0.0, (record['heightM'] or 0) - record['mainRoofM'] - 6) if record.get('mainRoofM') else 0
        vpage.goto(f'{BASE}/scripts/quality/viewer.html?m={rel}&az={az:.1f}&rise={rise:.1f}')
        vpage.wait_for_function('window.ready', timeout=240000)
        for name in ['street', 'entrance', 'facade', 'oblique', 'roof']:
            data = vpage.evaluate(f"window.shoot('{name}')")
            open(os.path.join(out, f'glb-{name}.jpg'), 'wb').write(base64.b64decode(data.split(',')[1]))
        record['viewer'] = vpage.evaluate('window.info')
        record['viewerErrors'] = verrs
        vpage.close()
    record['errors'] = errors
    json.dump(record, open(os.path.join(out, 'case.json'), 'w'), indent=1)
    ctx.close()
    shutil.rmtree(user_dir, ignore_errors=True)
    brief = {k: record.get(k) for k in ('id', 'heightM', 'features', 'layers', 'entranceBearing', 'uploadToReadySeconds', 'exports')}
    print(json.dumps(brief), 'errors:', errors[:4], flush=True)
    return record


with sync_playwright() as p:
    for case in SPEC['cases']:
        if WANTED and case['id'] not in WANTED:
            continue
        run_case(p, case)
