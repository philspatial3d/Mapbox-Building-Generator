# Performance baseline and budgets

The baseline was recorded on 2026-11-02 on an Apple M2 Pro (macOS 26.1) in Playwright Chromium. The footprint is a 40 × 28 m lot in the Sydney CBD (`codex/evidence/bg-100/performance/lot-40x28.geojson`). Raw results are in the same folder.

**Phone numbers are emulated**: 390 × 844 at 3×, with the CPU throttled 4× through DevTools on the same GPU. No real phone was measured. Record real-device numbers in the last section when they exist.

## Baseline

| Preset | Generate (ms, Node) | Features | Layers | Desktop frame p50 / p95 (ms) | Phone-emulated frame p50 / p95 (ms) | GLB (MB) | GLB export desktop / phone (s) |
|---|---|---|---|---|---|---|---|
| Gabled Stacked Townhouses | 26 | 242 | 13 | 8.3 / 9.1 | 16.6 / 24.6 | 1.3 | 0.15 / 0.42 |
| Avenue Mid-Rise Rental (5-over-1) | 14 | 264 | 22 | 8.3 / 16.6 | 24.3 / 26.0 | 1.6 | 0.19 / 0.65 |
| Haussmann Limestone Block | 51 | 378 | 18 | 8.3 / 8.5 | 17.0 / 25.8 | 4.7 | 0.38 / 1.40 |
| Limestone Art Deco Tower (RAMSA style) | 47 | 1,353 | 20 | 8.3 / 9.2 | 17.3 / 25.9 | 10.4 | 0.73 / 3.17 |
| Diagrid on Landmark Base (Hearst style) | 97 | 1,249 | 14 | 8.3 / 9.3 | 16.7 / 25.0 | 10.4 | 0.69 / 2.46 |
| Spiral Setback Supertall (Burj Khalifa style) | 155 | 1,606 | 12 | 8.3 / 8.8 | 16.6 / 24.2 | 32.7 | 2.07 / 7.67 |

- **Frame times** were sampled with `requestAnimationFrame` during a 6 s, 180° orbit at z17.6 and 60° pitch. The desktop figures sit at the 120 Hz display cap, so they show headroom, not a ceiling.
- **Generate** times the geometry code on its own (`scripts/measure_generation.mjs`: median of 5 after a warm-up). The page has no reliable "model ready" signal, so upload-to-visible time is not measured.
- **Mid-rise rental on the phone** is the slowest case (41 fps median). It has the most layers (22), and Mapbox draws each layer separately, so layer count matters more than feature count here.
- **The supertall's GLB** (32.7 MB, 7.7 s emulated) is the outlier, and the most likely problem on a real phone.

## Budgets

| Budget | Limit | Enforced by |
|---|---|---|
| Components, vertices and solids per preset (two standard footprints) | recorded value + 15% | `node scripts/check_budgets.mjs` (fails the run) |
| Geometry generation | ≤ 250 ms per preset on the 40 × 28 m lot (desktop Node). All 62 presets pass; the slowest is Wraparound Balcony Residences at 222 ms max (`generation-all.jsonl`) | manual: `node scripts/measure_generation.mjs <footprint> --all` |
| Phone-emulated frame time while orbiting | p95 ≤ 33 ms (30 fps) | manual: `scripts/measure_performance.py` |
| GLB size | low and mid-rise ≤ 8 MB; towers ≤ 15 MB; supertalls ≤ 40 MB | manual: `scripts/measure_performance.py` |
| Generated fill-extrusion layers | ≤ 24 | manual: `scripts/measure_performance.py` (`layers`) |

`scripts/budgets.json` currently records 62 presets:

| Footprint | Median vertices | Largest | Smallest |
|---|---|---|---|
| tower (40 × 28 m) | 40,600 | Spiral Setback Supertall, 198,500 | Villa Savoye, 1,300 |
| block (L-shape) | 66,900 | Stacked Pagoda Supertall, 368,600 | Villa Savoye, 2,100 |

After a deliberate increase, rerun with `--update` and give the reason in the change.

## Level of detail

- **Textures:** there is texture LOD. Patterns are pre-filtered per whole zoom from 14 to 22 (`zoomScaledPattern`), which keeps them at true size and avoids shimmer.
- **Geometry:** there is no geometric LOD. The map, the AR viewer and the GLB carry one level of detail. Mapbox fill-extrusions have no per-feature LOD, and the GLB has no `MSFT_lod` levels or simplified variants.
- **If real-device numbers miss the budgets**, the likely first steps are:
  1. merge thin layers (rails, mullions, courses) into fewer fill-extrusion layers;
  2. offer a reduced GLB that drops sub-0.15 m parts and merges roof courses into one sloped mesh;
  3. Draco-compress GLB exports for towers.

## Real devices

Not yet measured. To record: device, OS and browser, preset, frame p50 and p95 while orbiting, GLB export time, and any visible artefacts.
