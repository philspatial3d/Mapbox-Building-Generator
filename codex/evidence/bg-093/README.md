# BG-093 local review evidence

Automated checks, desktop browser results and physical devices are separate categories. No physical-device evidence is included.

## Desktop views

- [Integrated phone Controls panel](mobile-menu-latest.png) and [persistent floor dock](mobile-floor-latest.png).
- [Residential bedroom](residential-latest.png), [living room](residential-living-latest.png), [office](office-latest.png), [office setback](office-setback-latest.png), [tapered floor 20](tapered-floor20.png).
- [Residential walkthrough](residential-walk.webm) and [office/lift walkthrough](office-walk.webm). These use a separate virtual camera.
- `model-*.png`: eight source GLB eye-level reviews; `fixture-*.png`: 18 project fixture reviews. `fixture-review-stats.txt` records both detail levels.
- [Final upload/generation/download smoke](app-final-smoke.txt) and [editor screenshot](app-final-export.png).

## Measurements

- `baseline-*.txt`: original typical-floor instancing.
- `*-latest-metrics.txt`: final warmed desktop room samples. Raw scene telemetry and external rAF percentiles are separate fields.
- `browser-*-latest.txt`: four viewport sizes and tested physical tracking-state invariance.
- `stream-stress-latest.txt`: three floor-switch rounds before the final threshold geometry; `room-style-stress.txt`: bounded room cache and geometry reuse through style changes.
- `floor-scale-latest.txt`: two-/120-storey quick jumps, including cold spikes; these are not warmed benchmarks.
- `staged-*.txt`: worker planning/handoff times, separate from floor streaming.
- `lift-final.txt`: completed call/board/travel/exit-to-idle browser run.
- `mbg-bg093-final-*.log`: automated checks. The geometry script logs existing guard/fallback diagnostics before reporting its final pass.

See [the full review](../../INTERIOR_IMMERSION_REVIEW.md) for budgets, limitations, licences and remaining acceptance.
