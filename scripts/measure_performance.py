"""Rendering and export performance of the Mapbox editor view.

For each preset: frame times while the camera orbits the building, generated layer and
feature counts, and GLB export time and size. Generation time is not measured here: the
page has no reliable "model ready" signal, so it is timed in Node with
scripts/lib/headless_generator.mjs (docs/PERFORMANCE.md). Runs a desktop profile and an
emulated phone profile (390x844 at 3x, CPU throttled 4x through the DevTools protocol).
Emulation is not a real device: GPU speed, thermal limits and mobile browser behaviour are
not reproduced, so record real-device numbers separately in docs/PERFORMANCE.md.

usage: python scripts/measure_performance.py <app url> <footprint.geojson> <out.json> [preset name ...]
needs: pip install playwright && playwright install chromium; the app served locally.
"""
import json
import os
import shutil
import statistics
import sys
import tempfile
import time

from playwright.sync_api import sync_playwright

APP, FOOTPRINT, OUT = sys.argv[1], sys.argv[2], sys.argv[3]
WANTED = sys.argv[4:] or [
    'Gabled Stacked Townhouses', 'Avenue Mid-Rise Rental (5-over-1)', 'Haussmann Limestone Block',
    'Limestone Art Deco Tower (RAMSA style)', 'Diagrid on Landmark Base (Hearst style)',
    'Spiral Setback Supertall (Burj Khalifa style)'
]
PROFILES = {
    'desktop': {'viewport': {'width': 1440, 'height': 900}, 'scale': 1, 'cpu': 1},
    'phone-emulated': {'viewport': {'width': 390, 'height': 844}, 'scale': 3, 'cpu': 4},
}
ORBIT = """async () => {
  const m = window.__map;
  const samples = [];
  let last = performance.now();
  let running = true;
  const tick = now => { samples.push(now - last); last = now; if (running) requestAnimationFrame(tick); };
  requestAnimationFrame(tick);
  m.easeTo({ bearing: m.getBearing() + 180, duration: 6000, easing: t => t });
  await new Promise(r => setTimeout(r, 6200));
  running = false;
  return samples.slice(5);
}"""


def percentile(values, p):
    values = sorted(values)
    return values[min(len(values) - 1, int(len(values) * p))] if values else None


def run(profile_name, profile):
    rows = []
    with sync_playwright() as p:
        user_dir = tempfile.mkdtemp(prefix='mbg-perf-')
        ctx = p.chromium.launch_persistent_context(user_dir, headless=True, accept_downloads=True,
            args=['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'],
            viewport=profile['viewport'], device_scale_factor=profile['scale'], has_touch=profile_name != 'desktop')
        page = ctx.new_page()
        errors = []
        page.on('pageerror', lambda e: errors.append(str(e)[:200]))
        page.on('dialog', lambda d: d.dismiss())
        if profile['cpu'] > 1:
            cdp = ctx.new_cdp_session(page)
            cdp.send('Emulation.setCPUThrottlingRate', {'rate': profile['cpu']})
        page.goto(f'{APP}?debug=1')
        page.wait_for_function("window.__map && window.__map.loaded() && document.querySelectorAll('#presetSelect option').length>5", timeout=240000)
        options = page.evaluate("()=>[...document.querySelectorAll('#presetSelect option')].map(o=>[o.value,o.text])")
        for name in WANTED:
            value = next((v for v, t in options if t == name), None)
            if not value:
                continue
            page.select_option('#presetSelect', value)
            time.sleep(1)
            page.evaluate("()=>{document.getElementById('openAR').disabled=true; document.getElementById('geoUpload').value='';}")
            page.set_input_files('#geoUpload', FOOTPRINT)
            page.wait_for_function("!document.getElementById('openAR').disabled", timeout=300000)
            counts = page.evaluate("""()=>{const m=window.__map; let features=0, layers=0;
                for (const id of Object.keys(m.getStyle().sources)) { const d=m.getSource(id)._data; if (d && d.features && !id.startsWith('mbg-') && id !== 'composite') features += d.features.length; }
                layers = m.getStyle().layers.filter(l => l.type === 'fill-extrusion' && /-col$/.test(l.id)).length;
                return { features, layers }; }""")
            centre = page.evaluate("()=>{const m=window.__map; return m.getCenter().toArray();}")
            page.evaluate("([c])=>window.__map.jumpTo({center:c, zoom:17.6, pitch:60})", [centre])
            page.wait_for_function("window.__map.loaded()", timeout=120000)
            time.sleep(1.5)
            frames = page.evaluate(ORBIT)
            page.select_option('#export3dFormat', 'glb')
            t1 = time.time()
            with page.expect_download(timeout=300000) as dl:
                page.evaluate("()=>document.getElementById('download3D').click()")
            path = os.path.join(user_dir, 'export.glb')
            dl.value.save_as(path)
            rows.append({
                'profile': profile_name, 'preset': name,
                'exportSeconds': round(time.time() - t1, 2), 'glbMB': round(os.path.getsize(path) / 1048576, 2),
                'features': counts['features'], 'layers': counts['layers'],
                'frameMsP50': round(statistics.median(frames), 1) if frames else None,
                'frameMsP95': round(percentile(frames, 0.95), 1) if frames else None,
                'fpsMedian': round(1000 / statistics.median(frames), 1) if frames else None,
            })
            print(json.dumps(rows[-1]), flush=True)
        ctx.close()
        shutil.rmtree(user_dir, ignore_errors=True)
        if errors:
            print('page errors:', errors[:3])
    return rows


results = []
for name, prof in PROFILES.items():
    results += run(name, prof)
json.dump({'measuredAt': time.strftime('%Y-%m-%dT%H:%M:%S%z'), 'app': APP, 'footprint': os.path.basename(FOOTPRINT),
           'note': 'phone-emulated = Chromium, 390x844 @3x, CPU 4x throttled; not a real device', 'results': results},
          open(OUT, 'w'), indent=1)
