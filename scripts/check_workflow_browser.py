"""The default workflow in a real browser: click a mapped building, wait for the model,
then export GLB, IFC4 and GeoJSON through the visible controls. Desktop (1440x900) and a
narrow touch screen (390x844). Fails on any console or page error, or a failed export.

usage: python scripts/check_workflow_browser.py <app url> [lng lat]
needs: pip install playwright && playwright install chromium; the app served locally.
"""
import json
import os
import shutil
import sys
import tempfile
import time

from playwright.sync_api import sync_playwright

APP = sys.argv[1]
LNG, LAT = (float(sys.argv[2]), float(sys.argv[3])) if len(sys.argv) > 3 else (151.2070, -33.8688)
PROFILES = {'desktop': ({'width': 1440, 'height': 900}, False), 'phone': ({'width': 390, 'height': 844}, True)}
failures = []

for name, (viewport, touch) in PROFILES.items():
    with sync_playwright() as p:
        user_dir = tempfile.mkdtemp(prefix='mbg-flow-')
        ctx = p.chromium.launch_persistent_context(user_dir, headless=True, accept_downloads=True,
            args=['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'],
            viewport=viewport, has_touch=touch, is_mobile=touch, device_scale_factor=3 if touch else 1)
        page = ctx.new_page()
        errors = []
        page.on('pageerror', lambda e: errors.append('pageerror: ' + str(e)[:200]))
        page.on('console', lambda m: m.type == 'error' and errors.append('console: ' + m.text[:200]))
        page.on('dialog', lambda d: (errors.append('dialog: ' + d.message), d.dismiss()))
        page.goto(f'{APP}?debug=1')
        page.wait_for_function("window.__map && window.__map.loaded()", timeout=240000)
        page.evaluate("([lng,lat])=>window.__map.jumpTo({center:[lng,lat], zoom:17.2, pitch:45, bearing:0})", [LNG, LAT])
        page.wait_for_function("window.__map.loaded() && window.__map.getLayer('ctx-3d-buildings')", timeout=120000)
        time.sleep(2)
        target = page.evaluate("""()=>{const m=window.__map; const c=m.getCanvas(); const w=c.clientWidth, h=c.clientHeight;
            for (let r=0; r<260; r+=18) for (let a=0; a<6.28; a+=0.5) { const x=w/2+r*Math.cos(a), y=h/2+r*Math.sin(a);
              if (m.queryRenderedFeatures([x,y], {layers:['ctx-3d-buildings']}).length) { const b=c.getBoundingClientRect(); return [b.left+x, b.top+y]; } }
            return null; }""")
        if not target:
            failures.append(f'{name}: no mapped building found to click')
            ctx.close()
            continue
        page.evaluate("()=>{document.getElementById('openAR').disabled=true}")
        if touch:
            page.touchscreen.tap(target[0], target[1])
        else:
            page.mouse.click(target[0], target[1])
        t0 = time.time()
        page.wait_for_function("!document.getElementById('openAR').disabled", timeout=240000)
        built = round(time.time() - t0, 1)
        if touch and page.evaluate("()=>!!document.getElementById('controlsToggle') && getComputedStyle(document.getElementById('controlsToggle')).display !== 'none'"):
            page.click('#controlsToggle')
            time.sleep(0.6)
        sizes = {}
        for fmt, button in [('glb', '#download3D'), ('ifc', '#download3D'), ('geojson', '#downloadGeo')]:
            if fmt != 'geojson':
                page.select_option('#export3dFormat', fmt)
            page.locator(button).scroll_into_view_if_needed()
            with page.expect_download(timeout=240000) as dl:
                page.click(button)
            path = os.path.join(user_dir, f'out.{fmt}')
            dl.value.save_as(path)
            sizes[fmt] = os.path.getsize(path)
            if sizes[fmt] < 1000:
                failures.append(f'{name}: {fmt} export is only {sizes[fmt]} bytes')
        geo = json.load(open(os.path.join(user_dir, 'out.geojson')))
        source = geo['mbg_export']['asset']['provenance']['source']
        print(f"{name}: built in {built}s from {source['type']} (source height {source['sourceHeightM']} m), exports {json.dumps(sizes)}, errors {len(errors)}")
        failures += [f'{name}: {e}' for e in errors]
        ctx.close()
        shutil.rmtree(user_dir, ignore_errors=True)

if failures:
    print('\n'.join('FAIL ' + f for f in failures))
    sys.exit(1)
print('Click-to-export workflow passed on desktop and phone.')
