# Architectural quality harness

Reproduces the evidence in [docs/ARCHITECTURAL_QUALITY.md](../../docs/ARCHITECTURAL_QUALITY.md): six fixed cases, generated through the real app, photographed from matched cameras in the Mapbox view and in an independent three.js viewer.

Needs the app served locally from the repo root, and a Python venv with `playwright` (Chromium installed) and `pillow`.

```bash
python3 -m http.server 8161 --bind 127.0.0.1 &          # from the repo root
PY=/path/to/venv/bin/python
$PY scripts/quality/capture.py http://127.0.0.1:8161/app.html output/quality/after
$PY scripts/quality/sheet.py output/quality/after          # one contact sheet per case
MBG_PHONE=1 $PY scripts/quality/capture.py http://127.0.0.1:8161/app.html output/quality/after-phone
```

To capture a baseline, check the older commit out into another folder, copy `scripts/quality/` and `mapbox-config.js` into it, serve it on another port and run `capture.py` there with `MBG_SERVED_ROOT=<that folder>`.

| File | Role |
|---|---|
| `cases.json` | The site, and per case: footprint, library preset (or none: first-use defaults) |
| `make_footprints.py` | Writes `footprints/*.geojson` from plans in metres, turned to face the street |
| `capture.py` | Fresh browser profile per case: select preset, upload footprint, export GLB, IFC4 and GeoJSON with the real buttons, then three Mapbox views and five viewer views. Writes `case.json` (settings used, counts, timings, console errors) |
| `viewer.html` | Independent GLB viewer (three.js from esm.sh, no app code): sky-dome light, fixed sun, street, entrance, facade, oblique and roof cameras |
| `sheet.py` | Contact sheet per case |
| `rig.mjs` | Builds a captured case headlessly and lists the generated parts, for work on the generator |

`capture.py` reads the settings the app used through the `?debug=1` hook `window.__mbgLastConfig()`. The street camera faces the generated entrance, read from the exported GeoJSON. `viewer.html` needs network access.
