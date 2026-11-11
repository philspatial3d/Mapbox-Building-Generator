# Benchmark harness

Reproduces the comparison in [docs/BENCHMARK.md](../../docs/BENCHMARK.md). Outputs go to `output/benchmark/` (git-ignored), or `$MBG_BENCH_WORK` if it is set. That directory must be inside the repo, so the app server can serve the GLBs to the viewer.

Requirements:
- the app served locally (default `http://127.0.0.1:8153/app.html`; override with `MBG_APP_URL`);
- a Python venv with `playwright` (Chromium installed), `ifcopenshell`, `shapely`, `trimesh`, `scipy` and `pillow`.

```bash
PY=/path/to/venv/bin/python scripts/benchmark/fetch_refs.sh        # download + extract references
/path/to/venv/bin/python scripts/benchmark/run_case.py duplex fzkhaus institute smiley schependomlaan esplanades clinic
/path/to/venv/bin/python -I scripts/benchmark/metrics.py duplex fzkhaus institute smiley schependomlaan esplanades clinic
```

| File | Role |
|---|---|
| `fetch_refs.sh` | Downloads the seven models and runs `extract_ref.py` on each |
| `extract_ref.py` | IfcOpenShell: ground outline, storeys, roof slope, colours, reference GLB |
| `cases.json` | Per case: site, ground level, library preset, editor refinements |
| `run_case.py` | Uploads the footprint, imports the preset, generates and exports through the real app (`exporttest.py`). It then renders both models at matched views (`shoot.py`, `viewer.html`) into `gen/<case>/compare.jpg` |
| `metrics.py` | Height error, storeys, footprint IoU, roof-form agreement |

`viewer.html` loads three.js from esm.sh, so rendering needs network access.
