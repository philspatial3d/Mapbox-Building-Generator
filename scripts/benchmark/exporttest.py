"""Upload a footprint, apply a preset JSON, export GLB/GeoJSON/IFC through the real buttons.
usage: exporttest.py <preset.json> <footprint.geojson> <outdir> [viewport WxH]"""
import sys, time, os, json
from playwright.sync_api import sync_playwright
preset, fp, out = sys.argv[1:4]
vw, vh = map(int, (sys.argv[4] if len(sys.argv) > 4 else '1280x800').split('x'))
os.makedirs(out, exist_ok=True)
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
WORK = os.environ.get('MBG_BENCH_WORK', os.path.join(ROOT, 'output', 'benchmark'))
APP_URL = os.environ.get('MBG_APP_URL', 'http://127.0.0.1:8153/app.html')
D = WORK + '/'
with sync_playwright() as p:
    import shutil; shutil.rmtree(D + 'profile-export', ignore_errors=True)
    ctx = p.chromium.launch_persistent_context(D + 'profile-export', headless=True, accept_downloads=True,
        args=['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'], viewport={'width': vw, 'height': vh})
    pg = ctx.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append('PAGEERR ' + str(e)[:300]))
    pg.on('console', lambda m: m.type == 'error' and errs.append(m.text[:300]))
    pg.on('dialog', lambda d: (errs.append('DIALOG ' + d.message), d.dismiss()))
    pg.goto(f'{APP_URL}?debug=1')
    pg.wait_for_function("window.__map && window.__map.loaded() && document.querySelectorAll('#presetSelect option').length>5", timeout=120000)
    time.sleep(1)
    pg.set_input_files('#presetImportFile', preset); time.sleep(1)
    pg.evaluate("()=>{document.getElementById('openAR').disabled=true}")
    pg.set_input_files('#geoUpload', fp)
    pg.wait_for_function("!document.getElementById('openAR').disabled", timeout=240000); time.sleep(1)
    results = {}
    for fmt, button, sel in [('glb', '#download3D', 'glb'), ('ifc', '#download3D', 'ifc'), ('geojson', '#downloadGeo', None)]:
        if sel: pg.select_option('#export3dFormat', sel)
        t0 = time.time()
        with pg.expect_download(timeout=240000) as dl:
            pg.evaluate(f"()=>document.querySelector('{button}').click()")
        d = dl.value
        path = os.path.join(out, d.suggested_filename)
        d.save_as(path)
        results[fmt] = {'file': path, 'bytes': os.path.getsize(path), 'seconds': round(time.time() - t0, 1)}
    print(json.dumps(results), 'errs', errs[:5])
    ctx.close()
