# BG-093 — Interior immersion review

Status: substantial local review build; automated and desktop checks pass. Full visual acceptance and named-phone validation remain open. No push or deployment was performed.

## Starting state

Branch `codex/bg-093-interior-immersion` starts at `e955928` on `feature/bg-091-ultramodern-presets`. Inspection showed BG-091/092 were already pushed earlier in this chat and the hosting token was in ignored `mapbox-config.js`; the supplied starting-state description was stale. This change does not alter tokens or bypass protection. The instruction to withhold a new push remains in effect.

Mapbox remains 3.9.3 and AR Three.js 0.185.1. The editor's existing Three.js 0.160.0 export path is unchanged. No framework or hosting build step was added. Unrelated folders, duplicate HTML files, backend data and the old Bluehost ZIP were left alone.

## Implemented

- Schema-2 settings/payload migration; actual floor plates, elevations, heights, podium/setback/plant/roof metadata; stable room/object IDs, room types, door/passages, furnishing positions/orientations and cabinet-child references. Runtime instances have composite floor/room/object identities. Identical plates share plans; changed setback/taper/twist/courtyard plates are replanned. Furniture stays in metres.
- Existing floorplan engine remains the source. It prioritises connected plans, repairs actual openings before building walls, reserves 0.9 m door-to-standing routes and checks complete furniture containment. Kitchens try other walls when a run conflicts with a doorway. Sinks/hobs require a retained counter; overlapping fridges are rejected. Office support rooms include washrooms, meeting, private office, pantry, print/storage and reception where space permits.
- Disposable planning worker generated from the source engine, with byte-checked source parity and a yielding restricted-host fallback. Meshopt decoding uses two workers on the tested desktop after a Blob-worker probe. A finite 16-template CPU cache retains image bitmaps safely until teardown.
- Debounced/cancellable streaming retains at most three floor groups. Neighbours have architecture; active furnishing is initially capped at 24 items, then up to 48 per visited room, with a three-room LRU and settled distance LOD replacement. Room/floor batches can stop drawing independently. Geometry, materials, textures, workers and image bitmaps have explicit ownership/cleanup.
- Real storey/slab dimensions drive wall thickness/height, ceilings, floor finishes, skirting, door frames/headers/thresholds and shaft openings. Opposite wall faces have separate room finish ownership. Metre UVs continue across wall pieces; matte plaster restrains generated colour variation. Shared static interior IBL and contact shading avoid extra dynamic lights.
- Eight locally stored Poly Haven CC0 model derivatives, two meshopt GLBs each with up-to-1K WebP. Designed procedural desks, ergonomic task chairs, reception, kitchen runs/appliances, storage, sanitary fixtures, lamps and optional desk screens replace footprint extrusions. Worktops have real sink holes and integrated hob/oven components. Rugs follow clipped room polygons.
- Four finish palettes, building/room overrides, clear/restore furnishing and explicit workspace desk screens persist through editor/session/presets/AR. Finish changes reuse geometry; furnishing changes rebuild the affected room. Imported atlases retain source finishes (limits below).
- One responsive AR Controls panel integrates the studio, alignment settings and status. Camera/alignment settings begin collapsed. The floor/movement dock stays available separately. Safe-area spacing, keyboard focus, reduced motion and 44 px controls are provided. The old calibration selector is labelled Device height to distinguish it from floor selection.
- Editor and AR floor pickers list real floors, roof/crown and tier metadata with Ground/Top/setback jumps and keyboard navigation. One floor store also drives lift preview. Floor selection never changes heading, calibration, placement or the physical camera.
- Separate virtual camera with drag-look, WASD/arrows/touch and plate/wall/furniture collision. Physically tracked cameras are never corrected. One moving lift car has animated doors, cabin, panel, indicator and explicit call/arrive/open/board/close/travel/arrive/exit states. Its threshold bridges shaft clearance. Unaligned shafts reject virtual travel; physical AR offers floor preview only.
- Immediate startup sheet handles camera/orientation/motion/location independently, starts gesture-gated requests directly from the button and offers retry/preview. It explains local camera use. Desktop AR launch reserves one tab before async planning, fixing a duplicate-renderer popup bug. Missing saved sessions restore safely.

## Assets and imagegen

`assets/interior/README.md` and per-model manifests record sources, authors, CC0-1.0 redistribution rights, bounds, slots, measured triangles and texture dimensions. Licence source: https://polyhaven.com/license . Runtime does not call the Poly Haven API.

High/low triangle counts: bed 14,057/2,232; dining chair 13,206/1,320; dining table 1,048/156; armchair 8,916/1,068; ceiling lamp 5,602/684; coffee table 4,504/846; plant 11,401/6,433; sofa 2,728/327. Low bed and plant exceed the initial 1,500 target and remain explicit optimisation gates; all high variants are below 15k.

The requested imagegen skill generated smooth plaster, pale oak and limestone: three 1024-square WebP base-colour textures, about 852 KiB combined. sRGB, mipmaps and metre UVs are used; restrained procedural normals and material roughness are separate. `assets/interior-textures/manifest.json` records prompts, flags, model (`gpt-image-1.5`), provenance and SHA-256. These are generated project assets, not CC0 stock scans. The local `.env` was used only for generation, is ignored and must never be uploaded. Hosted runtime requires no image API key.

## Automated evidence

- `node scripts/build_advanced_presets.mjs`: all 37 presets regenerated byte-for-byte, SHA-256 `cde713825cbe84626587d161b111165281ede983cba8080599f57c51319a50b6`.
- `node scripts/check_external_fidelity.mjs`: six geometry scenarios and 37 presets, plus real semantic connectivity/containment, IDs, cabinet references, floor heights/plates, taper replanning and source/worker byte parity.
- `node scripts/check_ar_fidelity.mjs`: original tracking/projection/session/context/handoff contracts retained; interior assertion updated for asynchronous planning.
- `node scripts/check_interior.mjs`: migrations, 120-floor state, courtyard collision, lift transitions/rotated threshold, cancellation/bounded lifecycle, actual renderer resource ownership, shared ImageBitmap lifetime, opposite wall ownership/triangle conservation, metre UVs, quantized GLB transform regression, worker protocol/fallback, licence/codec/budget metadata and generated texture hashes/binary dimensions.
- `node scripts/build_interior_planner.mjs --check`: generated worker runtime byte-exact. Regenerate it after changing source planning functions.
- `node scripts/check_interior_browser.mjs interior-final`: CLI-driven responsive/UI/tracking/model-position checks against a locally staged residential or office payload.

## Desktop evidence and measured budgets

Local macOS, headless Chromium 155, 1280 × 720; UI also checked at 390 × 844, 320 × 640 and 844 × 390. No horizontal overflow, clipped panel or sub-44-px tested controls. These are viewport checks, not physical-phone tests.

| Scene | External rAF p50 / p95 | Calls | Submitted triangles | Textures |
| --- | --- | ---: | ---: | ---: |
| Original residential, 3 floors | 16.6 / 18.4 ms | 89 | 182,534 | 10 |
| Original office, 24 tower floors | 16.7 / 17.1 ms | 62 | 259,474 | 8 |
| New residential, selected bedroom, warm | 16.6 / 17.3 ms | 102 | 234,081 | 38 |
| New office, selected workspace, warm | 16.6 / 18.1 ms | 65 | 361,630 | 18 |

Residential floor-ready measured 279 ms / room refill 70 ms / estimated retained material texture storage 92.6 MiB. Office: 232 ms / 185 ms / 26.0 MiB. Samples collect 300 external rAF intervals and discard the first 120; scene telemetry separately retains a rolling 600 raw frame intervals. Texture estimates exclude driver overhead and CPU/decoder storage; they are not actual GPU VRAM. Camera perspectives differ from baseline, so this is not a controlled FPS improvement claim.

Warm desktop p95 exceeds the 16.7 ms 60 fps target. Cold/navigation samples include major compilation/loading spikes: the two-storey full-floor preview reached 444 calls and 166.6 ms p95 in its short sample; the 120-storey quick-jump sample reached 49.9 ms p95. These miss the provisional 250-call/33.3-ms fallback budgets and must not be hidden by reporting only warm frames.

Planning-to-handoff (separate from floor asset streaming): 907 ms residential, 916 ms office; earlier staged examples measured 743 ms for a 120-floor repeated-plate tower and 5,588 ms for a 40-floor/26-distinct-plate tapered tower. All reported worker planning. The varied tower misses the 3-second cold handoff goal, while remaining off the editor UI thread.

Three office switch rounds (0, 2, 12, 25) held settled counts at 118 geometries / 21 textures and kept heading, offsets, model transform and physical camera/projection byte-identical. This preceded the final threshold geometry. A later room/style exercise retained at most three detailed rooms, confirmed finish changes reused geometry and exercised optional desk screens. Bounded tests do not prove leak freedom for unlimited sessions.

Browser lift boarding, travel 2→4 and exit to idle passed after the threshold fix. Two-storey and 120-storey pickers passed Home/End and Ground/Top (3 and 121 entries including roof). Eye-level reviews cover eight GLBs and 18 designed fixtures; room screenshots cover residential, office, setback floor 3 and tapered floor 20. Walkthrough clips are review evidence, not aesthetic sign-off.

Fresh-session map-click generation, GeoJSON upload/generation, GeoJSON/GLB downloads, presets and AR handoff were exercised locally. Zero console errors were observed; existing pinned-Mapbox paint warnings and the AR shadow-map deprecation warning remain. Public Bluehost was not verified or changed (direct retrieval returned HTTP 406).

Working budgets: three resident floors/three detailed rooms, 24 initial/48 visited-room items, 16 source/LOD templates; aim under 250 calls, 500k submitted triangles, 128 MiB estimated material textures; floor-ready under 1 second warm/3 seconds cold. Named-phone tuning is still needed for 60 fps capable / stable 30 fps fallback.

## Remaining acceptance

- Complete contemporary/classic/workplace curation and independent frame/upholstery/metal/glass editing for source atlases. The ornate bed and tufted sofa do not suit every style. The full collection is not visually signed off.
- Optimise two low-LOD exceptions, full-floor architectural draw calls and cold shader/texture spikes. Native bounds/clearances should drive placement directly rather than only fitting models into planner footprints. Neighbours have architecture rather than fully furnished high detail; visibility uses room bounds/distance rather than a portal solver.
- Refine all fixtures, ceiling/wall junctions and varied-room lighting across four styles. Representative tests do not prove every irregular plan free of visual seams. Broader lift/landing coverage across taper/setback cases remains; unaligned shafts are preview-only. Optional tactile ratchet is deferred.
- Named Android/iOS permissions, camera, positional tracking, thermal, sustained 30/60 fps and memory testing. No physical device was available. Sensor preview is not positional world-lock evidence; no native tracking wrapper is implemented here.

## Review and hosting

Serve via PHP/HTTP; generate a building, launch AR, continue with preview, choose a floor and room, then Visit room. Individual models/fixtures are at `js/interior/review.html`. `debug=1` exposes `window.__arDebug.interior.telemetry()`.

`BLUEHOST_DEPLOYMENT.md` lists the exact upload tree: replace `app.html`/`ar.html` and add complete `js/interior/`, `assets/interior/`, `assets/interior-textures/` together. Preserve hosted token/backend settings and user data; never upload `.env`. The old ZIP is unchanged and this branch has not updated the live site.
