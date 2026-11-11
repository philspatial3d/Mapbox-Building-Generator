"""Render a GLB through viewer.html, served by the app server. usage: shoot.py <glb rel to the work dir> <out prefix> <views csv> [query extras]"""
import sys, base64, json, time
import os
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
WORK = os.environ.get('MBG_BENCH_WORK', os.path.join(ROOT, 'output', 'benchmark'))
APP_URL = os.environ.get('MBG_APP_URL', 'http://127.0.0.1:8153/app.html')
from playwright.sync_api import sync_playwright
glb, out, views = sys.argv[1], sys.argv[2], sys.argv[3].split(',')
extra = sys.argv[4] if len(sys.argv) > 4 else ''
with sync_playwright() as p:
    b = p.chromium.launch(headless=True, args=['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'])
    pg = b.new_page(viewport={'width': 900, 'height': 700}); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    base = APP_URL.rsplit('/', 1)[0]
    model = '/' + os.path.relpath(os.path.join(WORK, glb), ROOT)
    pg.goto(f'{base}/scripts/benchmark/viewer.html?m={model}{extra}')
    pg.wait_for_function('window.ready', timeout=180000)
    for v in views:
        data = pg.evaluate(f"window.shoot('{v}')")
        open(f'{out}-{v}.png', 'wb').write(base64.b64decode(data.split(',')[1]))
    print(json.dumps(pg.evaluate('window.info')), errs[:3])
    b.close()
