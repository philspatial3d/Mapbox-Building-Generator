# Codex Backlog — Building Generator

## BG-001 — Mobile controls drawer (hide on mobile, easy access)
Status: Done
**Problem**
Controls panel crowds the viewport on mobile.

**Acceptance**
- On width < 900px: controls are hidden by default behind a button.
- Button toggles a drawer/sheet that is scrollable.
- Drawer has a clear close affordance; does not block map interactions when closed.
- No layout regression on desktop.

**Files**
- index.html (CSS + UI wiring)

**Manual QA**
1. Open on mobile width (devtools). Confirm panel hidden.
2. Toggle open/close. Confirm map still pans/zooms when closed.
3. Generate building + download GeoJSON still works.

---

## BG-002 — Building presets (save/load/share)
Status: Done
**Acceptance**
- “Presets” dropdown with 6–10 curated presets (tower types). the presets are strictly based on different levels and parameters applied to the siderbar menu controls. 
-  Presets include 'Art Deco', 'Brutalist', 'Standard office', 'Condominium'
-  Presets must be extremely detailed, contain subtle and correct color patterns
- “Save preset” writes current cfg() to localStorage.
- “Export preset” downloads JSON; “Import preset” loads JSON and sets UI controls.
-  Preset schema versioned (e.g., `"schema": 1`).

**Files**
- index.html (UI)
- new: presets/defaults.json (or presets/*.json)

**Manual QA**
- Apply preset changes geometry and materials.
- Reload page → saved presets persist.
- Export/import round-trip works.

---

## BG-003 — Sidebar polish (collapsibles + keyboard)
**Acceptance**
- Collapsible headers have proper button semantics / ARIA.
- Keyboard navigation works (tab + enter/space toggles).
- “Random” never generates invalid combos (e.g., stepEvery=0, negative sizes).

...

---

## BG-004 — Interior stairs + procedural floorplans
Status: Done
**Acceptance**
- New collapsible section for stair and floorplan controls is present and wired into `cfg()`.
- Stairs generate per floor with selectable type/position and coherent rise/run extrusion.
- Stairwell can be cut from slabs when enabled.
- Interior floorplan walls generate per floor, clipped to each tapered shell, and avoid the stairwell.
- Stair rails and interior walls render as separate layers with configurable colors.
- Presets include contextual defaults for stair and floorplan settings.

**Files**
- index.html (controls, cfg/preset map/randomization, geometry helpers, build/render integration)
- presets/defaults.json (contextual interior defaults per preset)

**Manual QA**
1. Click any building, enable `Stairs` + `Floorplans`, and regenerate.
2. Change stair type (`Straight`, `L`, `U`, `Spiral`) and confirm geometry changes.
3. Toggle `Cut Stairwell From Slabs` and verify slab opening appears/disappears.
4. Apply each preset and confirm interior geometry remains coherent with tower height/massing.

---

## BG-005 — Floorplan visibility fix + top-bar floorplan mode
Status: Done
**Acceptance**
- Interior floorplan walls render reliably (meter-based layout, clipped to footprint/stairwell).
- A `View floorplan` button appears beside search when a building is active.
- Floorplan mode switches camera to top-down (`pitch: 0`) and hides roof/tower by showing a typical-floor 2D plan.
- Toggling off returns to tower view and restores prior camera pitch/bearing.

**Files**
- index.html (top bar UI, floorplan geometry layout fix, floorplan mode rendering)

**Manual QA**
1. Click building or upload GeoJSON and confirm `View floorplan` appears beside search.
2. Toggle `View floorplan` on and verify top-down plan view (no roof) and visible walls/stairs.
3. Toggle `Exit floorplan` and confirm camera/view restoration.

---

## BG-006 — Advanced program-aware floorplan layouts
Status: Done
**Acceptance**
- Floorplan mode uses a representative max-area shell so plans cover the full building footprint where possible.
- Clicked context buildings aggregate connected source-footprint fragments (not only a single tile slice).
- Residential layouts include bedrooms, bathrooms, kitchens, and main living/dining areas.
- Office/cellular layouts include hallway arteries, corner offices, meeting rooms, and support/bathroom nodes.
- Open-plan layouts use deterministic core-anchored geometry with structured cubicle grids, corner offices, meeting rooms, and service clusters.

**Files**
- index.html (program inference, advanced floorplan generator, room/corridor floorplan rendering)

**Manual QA**
1. Activate floorplan mode on a long/tapered building and verify plan footprint coverage is broad (not a tiny top slice).
2. Switch among `corridor`, `cellular`, `open`, and `grid` styles and confirm visible room-type variety.
3. Validate that residential-looking towers show bedroom/bath/main-area subdivisions and office towers show corner offices + meeting rooms.

---

## BG-007 — Agency design system + anti-generic guardrails
Status: Done
**Acceptance**
- Create `/agency` with required files: `BRIEF.md`, `BRAND.md`, `TOKENS.json`, `COMPONENT_RULES.md`, `DO_NOT.md`.
- Add concept sprint with 3+ directions and a selected direction frozen into `TOKENS.json`.
- Add internal creative-director critique pass and enforce answered checklist sections.
- Add variation levers with profile enforcement requiring >= 3 lever changes.
- Add build guardrails:
  - token-only color lint with baseline policy,
  - visual snapshot script for key pages,
  - component inventory page at `/styleguide.html`.

**Files**
- agency/BRIEF.md
- agency/BRAND.md
- agency/CONCEPT_SPRINT.md
- agency/TOKENS.json
- agency/COMPONENT_RULES.md
- agency/DO_NOT.md
- agency/CREATIVE_DIRECTOR.md
- agency/CRITIQUE_LOG.md
- agency/VARIATION_LEVERS.md
- agency/BASE_PROFILE.json
- agency/PROJECT_PROFILE.json
- agency/HEX_BASELINE.json
- agency/README.md
- scripts/check_concept_sprint.mjs
- scripts/check_variation_levers.mjs
- scripts/lint_tokens_only.mjs
- scripts/check_creative_director.mjs
- scripts/visual_regression.sh
- scripts/agency_pipeline.sh
- styleguide.html

**Manual QA**
1. Run `bash scripts/agency_pipeline.sh` and confirm all checks pass.
2. Open `styleguide.html` and confirm tokens are rendered in swatches and component examples.
3. Run `bash scripts/agency_pipeline.sh --with-snapshots` to generate `artifacts/visual` screenshots.

---

## BG-008 — Multi-direction landing suite (5 concepts)
Status: Done
**Acceptance**
- Create five distinct landing pages with different visual language and interaction logic.
- Each landing page includes:
  - CTA to open the generator map,
  - CTA to access account,
  - CTA to access Parametric QGIS plugin,
  - explanation of how the generator works,
  - explicit design thesis.
- Avoid generic template styling and apply intentional interaction/motion.
- Include purposeful use of D3, Three.js, and p5.js across the set.

**Files**
- landing/index.html
- landing/landing-atlas.html
- landing/landing-structural.html
- landing/landing-civic-fabric.html
- landing/landing-control-desk.html
- landing/landing-material-ledger.html
- landing/THESIS.md
- account.html
- qgis-plugin.html

**Manual QA**
1. Open each page under `landing/` and confirm distinct visual direction and interaction.
2. Verify CTAs resolve to map (`index.html`), account (`account.html`), and plugin (`qgis-plugin.html`).
3. Confirm each page contains both an explicit design thesis and a clear \"how it works\" explanation.

---

## BG-009 — Landing depth pass (Civic Fabric + Program Control Desk)
Status: Done

**Acceptance**
- Rebuild `Civic Fabric Studio` and `Program Control Desk` as fuller vertical landing pages (not two-card split layouts).
- Strengthen architectural tone with bolder linework, restrained typography, and material/drafting texture.
- Improve product clarity and sales messaging:
  - what the product is,
  - exact value/payoff for architects and junior teams,
  - clear explanation of pipeline and outcomes.
- Keep data-viz elements secondary and supportive.
- Add screenshot thumbnail placeholders for each page for easy real-product replacement.
- Preserve CTA set: map, account, Parametric QGIS plugin.

**Files**
- landing/landing-civic-fabric.html
- landing/landing-control-desk.html
- landing/assets/civic-product-thumb.svg
- landing/assets/control-product-thumb.svg
- landing/THESIS.md

**Manual QA**
1. Open both landing pages and confirm full-length vertical narrative structure.
2. Replace each placeholder SVG with a real screenshot and verify layout still holds.
3. Confirm CTA links work and secondary viz modules remain supportive, not dominant.

---

## BG-010 — Floorplan quality fixes (open plan, overlap, multi-corridor)
Status: Done
**Problem**
1. Open Plan style is cluttered with cubicle grids and corner offices — should show larger gapped zones.
2. Buildings with complex/multi-part geometries render multiple overlapping floorplans.
3. Large/wide buildings use a single corridor producing extremely long lines.

**Acceptance**
- Open Plan generates generous open-workspace bays with optional meeting pods — no cubicle grid.
- Overlapping shells are de-duplicated (>35% area overlap → skip) so only one floorplan per region.
- Multiple parallel corridors are placed automatically when the building cross-section exceeds a threshold.
- Side-bands are constructed between all corridor pairs, supporting room generation on both sides of each corridor.

**Files**
- index.html (`generateFloorplanModel`, `buildTypicalFloorplanSlice`)

**Manual QA**
1. Click a building, set floorplan style to `Open Plan`, toggle floorplan view — confirm large open bays with no cubicle grid.
2. Click an L-shaped or complex building — confirm no duplicate/overlapping floorplans.
3. Click a very wide building (e.g., Pier 60) — confirm multiple parallel corridors instead of one long single corridor.

---

## BG-014 — Multi-building mode + component composer + bulk export
Status: Done
**Acceptance**
- Add a toggleable multi-building mode that allows selecting up to 5 parcels by click.
- Keep selected buildings unobstructed by hiding underlying context building fragments.
- Add bulk export actions for selected set in both GeoJSON and GLB.
- Add single-building component composer supporting:
  - vertical stack split by base/split height,
  - optional wings,
  - top-stack style overrides inherited from base controls with explicit override controls.
- Export of multi-component building remains a single GLB scene.

**Files**
- app.html (toolbar controls, state/selection logic, build/render/export wiring)

**Manual QA**
1. Enable `Multi-building mode`, click up to 5 parcels, verify selection count updates and 6th click is blocked.
2. Click `Bulk GeoJSON` and `Bulk GLB`, confirm downloads complete from active selection.
3. Enable `Component Composer` with `Vertical Stacks`, set split height, and verify top stack styling changes only above the split.
4. Switch to `Stacks + Wings`, regenerate, and confirm wings are added while preserving single-file GLB export.

---

## BG-015 — Bluehost-friendly backend integration (accounts, profile, presets, saved buildings)
Status: Done
**Acceptance**
- Add a PHP backend that works on shared hosting and can default to SQLite locally while remaining configurable for Bluehost MySQL.
- Support account creation, sign-in/sign-out, and an easy demo account flow for testing.
- Support editable user customization/profile metadata in an account workspace.
- Allow saving preset JSON files to the backend account workspace.
- Allow saving generated building packages including GLB, styled GeoJSON, config snapshot, and optional preset snapshot.
- Provide a setup flow and documentation describing storage layout, seeded sample user, and testing workflow.

**Files**
- app.html (account status panel, preset/building save actions, preset deep-link loading)
- account.php
- account.html
- setup.php
- backend-config.php
- api/bootstrap.php
- api/auth.php
- api/profile.php
- api/presets.php
- api/buildings.php
- api/download.php
- storage/.htaccess
- storage/.gitkeep
- storage/database/.gitkeep
- storage/users/.gitkeep
- .gitignore
- codex/BACKEND_INTEGRATION_WORKFLOW.md

**Manual QA**
1. Run `php -S 127.0.0.1:8000`, open `setup.php`, and confirm the sample user is available.
2. Open `account.php`, sign in with the demo account or create a new user, and save profile changes.
3. Open `app.html`, generate a building, click `Save preset to account`, and confirm the preset appears in the account workspace.
4. From the same building, click `Save building to account`, then download the GLB and GeoJSON from the account workspace.
5. Open a saved preset from the account workspace and confirm `app.html?preset_id=...` loads that preset into the controls.

---

## BG-016 — Haunted AR folklore camera
Status: Implemented (physical-device and browser QA pending)
**Acceptance**
- Create a separate `/haunted_ar` experience that runs as a phone-first haunted camera in plain HTML/CSS/JS.
- Default presentation is nearly label-free after boot: the app should feel like opening a camera, not a dashboard.
- Use the current web AR stack available in-browser: secure-context camera/location access, motion sensors, and `immersive-ar` WebXR with hit-testing when the device/browser supports it.
- Use OpenStreetMap-based local analysis to read the nearby building/context and derive a dominant haunting archetype, with a nearby lore sweep used as a secondary influence when available.
- Apparitions should be subtle, delayed, and unnerving rather than immediate jump scares.
- Imported figures retain their intended proportions, use normal blending, and appear only in short delayed windows.
- Prefer the containing building's OSM tags over distant context; distinguish sourced local haunting reports from fictional place-pattern inference in diagnostics.
- Keep map-relative offsets at measured scale, and lock the XR floor origin to the viewer rather than a moving hit-test point.
- Include a hidden diagnostics mode for QA without breaking the default haunted-camera presentation.

**Files**
- haunted_ar/index.html
- haunted_ar/main.js
- codex/TASKS.md

**Manual QA**
1. Serve the repo on `localhost` or HTTPS and open `/haunted_ar/` on a phone.
2. Tap `open`, allow camera/location/motion, and confirm the interface collapses into a live camera view with minimal visible chrome.
3. Wait 20-40 seconds and pan slowly; confirm apparitions phase in gradually and mostly favor peripheral or fleeting reveals.
4. Long-press the top-left corner and confirm diagnostics open with the resolved haunt profile, location status, and network notes.
5. On a supported WebXR Android browser, tap the lower-right ring and confirm `immersive-ar` starts without console errors.

**Verification**
- Source syntax and entity manifest checks passed locally.
- Live browser and phone-camera checks are pending because localhost browser access was declined in this task.

---

## BG-011 - Control Desk rollout (landing + app UI)
Status: Done
**Acceptance**
- Promote the Program Control Desk direction to the production landing page.
- Remove the D3 visualizer from the production landing page and replace it with richer product messaging using Font Awesome icon blocks.
- Keep CTAs visible for map, account, and Parametric QGIS plugin.
- Add post-launch roadmap messaging for GLB export, building comparison, full city design, and full park design.
- Refine `index.html` to a strict, readable control-desk UI with square button styling, stronger sidebar/editor hierarchy, and clearer control labels.
- Keep existing generator functionality intact (building click, upload, floorplan mode, export).

**Files**
- landing/index.html
- landing/landing-control-desk.html
- index.html

**Manual QA**
1. Open `landing/index.html` and confirm no D3 module is present and icon-led product sections are visible.
2. Verify all three CTAs from landing resolve correctly.
3. Open `index.html` and validate updated sidebar/editor styling, map search + floorplan button layout, and working regenerate/random/export actions.

---

## BG-012 - Root index handoff (landing at parent level)
Status: Done
**Acceptance**
- Promote the production landing page to root `index.html`.
- Preserve the existing app UI and logic in a separate file.
- Keep styling intact after relocation.
- Update CTA links so generator actions resolve to the app entrypoint.

**Files**
- index.html
- app.html
- landing/index.html
- landing/landing-atlas.html
- landing/landing-structural.html
- landing/landing-civic-fabric.html
- landing/landing-control-desk.html
- landing/landing-material-ledger.html

**Manual QA**
1. Open root `index.html` and confirm landing styles/content render correctly.
2. Open `app.html` and confirm generator map/editor still functions.
3. From landing pages, click `Open Map`/`Launch Generator` and confirm they open `app.html`.

---

## BG-013 - Base default tuning (taller, slimmer, branded transparency)
Status: Done
**Acceptance**
- Increase startup tower defaults to be moderately taller and slimmer.
- Set default facade to semi-transparent.
- Refine default thickness values (borders, mullions, slabs, separators, rails) to read thinner.
- Align default color palette with the current Control Desk brand language.

**Files**
- app.html
- agency/HEX_BASELINE.json

**Manual QA**
1. Open `app.html` and confirm updated default control values (floors, taper, facade opacity).
2. Click any parcel and generate to verify the resulting tower reads taller/slimmer with semi-transparent facade.

---

## BG-015 — Rib/Lattice spacing normalization on curved facades
Status: Done
**Acceptance**
- Ribs use facade-plane measured spacing (segment length weighted), not raw vertex iteration.
- Lattice/exoskeleton posts use perimeter sampling based on spacing targets, avoiding clustering on curved/rounded footprints.
- Truss fallback uses simplified facade guide segments rather than every tiny vertex segment.
- Distribution remains visually even across long and curved facades.

**Files**
- app.html

**Manual QA**
1. Generate a rounded/tapered building with `Enable Ribs` on and verify rib spacing remains even around the perimeter.
2. Set `Exoskeleton Structure` to `Lattice` and vary density from `1` to `8`; verify no corner vertex clustering.
3. Test with high `Overall Roundness` and confirm ribs/lattice stay clean rather than busy/noisy.

---

## BG-016 — Roof system refresh (remove component composer, add crown taper + spire)
Status: Done
**Acceptance**
- Remove the `Component Composer` section and all associated behavior from the app editor.
- Add roof mode options under `Roof & Cornice`:
  - `Standard Flat Roof`
  - `Tapered Crown Roof` with configurable start floor and taper-per-floor.
- Roof geometry remains contextual to the computed top floor shell, including when tower taper is active.
- Add simple spire controls (toggle + fixed height/width/color) and generate spire mass on top of roof cap.

**Files**
- app.html

**Manual QA**
1. Confirm `Component Composer` no longer appears in the editor.
2. Set `Roof Style` to `Tapered Crown Roof` and verify top floors taper even when base tower taper is `none`.
3. Toggle `Enable Spire` and verify spire appears above roof/penthouse cap with configured height and width.
3. Run `bash scripts/agency_pipeline.sh` and confirm checks pass.

---

## BG-014 - Circulation overhaul (remove weave + vertical facade alignment + elevators)
Status: Done
**Acceptance**
- Remove Helical Facade Weave controls from the editor so they no longer appear in the menu.
- Keep tapered facade articulation vertically coherent by anchoring mullion placement to tower-level local axes.
- Add integrated elevator controls inside the circulation/floorplan section:
  - enable/disable elevators,
  - elevator setup type,
  - elevator banking mode,
  - elevator count and car dimensions,
  - elevator/shaft colors,
  - shaft slab cut toggle.
- Generate elevator shafts/cars in 3D and in floorplan mode, with slab cuts when enabled.

**Files**
- app.html

**Manual QA**
1. Open `app.html` and confirm no Helical Facade Weave section appears.
2. Generate a tapered building with mullions and verify vertical lines stay coherent floor-to-floor.
3. Enable elevators and confirm shafts/cars render in both tower view and floorplan view.
4. Toggle `Cut Elevator Shafts From Slabs` and confirm openings appear/disappear in slabs.

---

## BG-015 - Landing hero cleanup from annotated feedback
Status: Done
**Acceptance**
- Remove the crowded KPI tile strip from the top fold.
- Promote the product visual into the main hero so the right side is filled and balanced.
- Simplify top navigation by removing the topbar plugin button and keeping plugin access in hero/CTA.
- Preserve consistent styling and strong readability.

**Files**
- index.html

**Manual QA**
1. Open root `index.html` and confirm the KPI card row is gone.
2. Confirm the hero visual occupies the right side of the main fold.
3. Confirm topbar now shows only `Open Map` and `Your Account`.
4. Confirm `Parametric QGIS Plugin` remains accessible in hero and CTA sections.

---

## BG-016 - Hero visual consistency pass (panel height + white background + thinner floors)
Status: Done
**Acceptance**
- Match right hero visual panel height to the left hero content panel (no oversized right panel on desktop).
- Set hero visualization background to white.
- Thin floor slabs in the hero building preview.
- Improve visualization reliability with safer renderer init and resize handling.

**Files**
- index.html

**Manual QA**
1. Open `index.html` on desktop and confirm the right hero panel height tracks the left panel.
2. Confirm hero visualization background is white.
3. Confirm floor slabs read thinner than previous version.
4. Resize the browser and confirm visualization continues rendering without blank/intermittent state.

---

## BG-017 - Hero sales copy tightening and CTA focus
Status: Done
**Acceptance**
- Remove `Parametric QGIS Plugin` from the hero header action row.
- Change hero headline claim from "minutes" to "seconds".
- Replace hero description with: `3D Building Designer is a map-native design tool for architects and urban design teams.`
- Remove hero metadata block (`Primary user`, `Core move`, `Review mode`, `Current output`).
- Increase hero headline visual weight/size.
- Make `Open Map` CTA more assertive by adding a right arrow in primary header/hero placements.

**Files**
- index.html

**Manual QA**
1. Open `index.html` and confirm hero headline reads `...in seconds.`
2. Confirm hero description is exactly the single-sentence version above.
3. Confirm the hero action row has only `Open Map →`.
4. Confirm the metadata line block is removed.
5. Confirm both topbar and hero `Open Map` buttons include a right arrow.

---

## BG-018 - Ambient p5 background building visual
Status: Done
**Acceptance**
- Add a full-page background `p5.js` sketch behind landing content.
- Render a slowly rotating off-gray stylized building made from stacked tapered extruded segments.
- Keep text legibility high by using low-contrast linework/opacity and preserving content layer priority.

**Files**
- index.html

**Manual QA**
1. Open `index.html` and confirm a subtle rotating building appears in the page background.
2. Confirm the building reads as stacked tapered extrusions (not a single flat block).
3. Confirm hero and section text remain clearly legible in front of the background.

---

## BG-019 - Background sketch first-paint visibility tuning
Status: Done
**Acceptance**
- Make the p5 background building clearly visible immediately on load.
- Increase contrast/opacity and right-side placement while preserving headline legibility.
- Keep hero content foreground dominant.

**Files**
- index.html

**Manual QA**
1. Open `index.html` and confirm the rotating background building is visible at first paint.
2. Confirm the building is biased to the right side and does not obstruct headline readability.
3. Confirm text and CTA contrast remain readable.

---

## BG-020 - Hero-anchored p5 visual alignment and lightness tuning
Status: Done
**Acceptance**
- Place the p5 building sketch inside the hero grid visual area (not full-page background).
- Align visual to the right side and preserve clear text space on the left.
- Reduce visual intensity by 50% to keep copy legible.

**Files**
- index.html

**Manual QA**
1. Open `index.html` and confirm the rotating p5 building appears in the hero right column.
2. Confirm hero copy remains left-aligned with clear breathing room.
3. Confirm p5 visual appears lighter than prior pass.

---

## BG-021 - p5 tower form update (centered, taller, softer top, gelatinous green)
Status: Done
**Acceptance**
- Center the p5 tower mass in the hero visual area.
- Double story count and reduce taper intensity by half.
- Add an elegant rounded roof cap.
- Soften material treatment with gelatinous feel and green palette centered on `#2f7158`.

**Files**
- index.html

**Manual QA**
1. Open `index.html` and confirm tower is centered within hero visual panel.
2. Confirm tower reads taller (more stories) with less aggressive taper.
3. Confirm roof has rounded cap geometry.
4. Confirm material reads softer/gel-like in green tone.

---

## BG-022 - Hero p5 shape reset with taller centered stack and rounded edges
Status: Done
**Acceptance**
- Revert to original stacked tapered shape language.
- Increase vertical read (taller stack).
- Round edge feel without changing core silhouette.
- Correct visual centering in hero panel.

**Files**
- index.html

**Manual QA**
1. Open `index.html` and confirm stack reads like original stepped taper.
2. Confirm tower appears taller than the original baseline.
3. Confirm edges appear visually softened/rounded.
4. Confirm tower is centered in the hero visual area.

---

## BG-023 - Hero p5 refinement (reduced taper, floor separation, darker edges, polish)
Status: Done
**Acceptance**
- Reduce taper intensity by 50% from previous state.
- Increase visual separation between floors.
- Add darker edge linework for clearer form readability.
- Improve overall visual quality while preserving legibility and brand tone.

**Files**
- index.html

**Manual QA**
1. Open `index.html` and confirm taper is visibly milder than prior pass.
2. Confirm floors have clearer spacing between stacked segments.
3. Confirm edge outlines read darker/crisper than fill planes.
4. Confirm overall tower appearance feels cleaner/more polished.

---

## BG-024 - Hero p5 color + opacity + centering pass
Status: Done
**Acceptance**
- Apply an orange-to-plum gradient to the hero p5 tower.
- Increase overall visual opacity/strength.
- Ensure the rotating tower is centered in the hero visual column during animation.

**Files**
- index.html

**Manual QA**
1. Open `index.html` and confirm tower reads in an orange/plum palette.
2. Confirm tower appears more opaque than previous pass.
3. Confirm tower stays centered in the right hero column while rotating.

---

## BG-025 - App control desk menu/layout pass
Status: Done
**Acceptance**
- [x] Top-left cards align cleanly and the `Custom Footprint` upload control no longer overflows.
- [x] Right editor has a menu hide/show toggle that can fully collapse the panel.
- [x] Remove `Save preset`, leaving only `Import preset` and `Export preset`.
- [x] Move `Regenerate Building` to the top section and `Download GeoJSON` to the bottom of the menu.

**Files**
- app.html

**Manual QA**
1. Open `app.html` and confirm top-left `Program Control Desk`, `Show 3D buildings`, and `Custom Footprint` cards align.
2. Click `Hide Menu` in the right panel, then use `Open Menu` to restore it on desktop and mobile widths.
3. Verify presets panel only shows `Export preset` and `Import preset`.
4. Confirm `Regenerate Building` appears near the top and `Download GeoJSON` appears at the bottom.

---

## BG-026 - Basemap theme + style switcher
Status: Done
**Acceptance**
- [x] Default basemap is tuned to an off-white cream ground with softer water and park tones.
- [x] Add neutral sky/fog color and warmer scene lighting for improved 3D extrusion glow.
- [x] Add bottom-left `Layers` button with four choices: `Default`, `Dark`, `Satellite`, `Blank`.
- [x] Blank style renders as an off-white canvas.
- [x] Style switching preserves generator behavior by reapplying textures/context layers and rerendering generated geometry.

**Files**
- app.html

**Manual QA**
1. Open `app.html` and verify default style uses cream ground, faded blue water, and subtle park green.
2. Rotate/pitch map and verify sky/fog and extrusion lighting look warmer and more natural.
3. Use `Layers` to switch through `Default`, `Dark`, `Satellite`, `Blank`.
4. Generate a building, switch styles, and confirm the generated geometry remains visible/functional.

---

## BG-027 - Balcony variants + generated building ground shadows
Status: Done
**Acceptance**
- [x] Add `None (no balconies)` balcony mode.
- [x] Add an all-sides separated balcony mode named `Perimeter segmented (all sides)`.
- [x] Ensure balcony railings generate for all balcony segments (not only the last one on each floor).
- [x] Add visible soft ground shadows for generated buildings in tower view.

**Files**
- app.html

**Manual QA**
1. Generate a tower and set `Balcony Type` to `None (no balconies)`; confirm no balcony geometry appears.
2. Set `Balcony Type` to `Perimeter segmented (all sides)`; confirm separated balconies appear around all edges.
3. Confirm railings are present across all generated balcony segments in segmented mode.
4. Confirm generated buildings cast visible soft ground shadows in 3D tower view.

---

## BG-028 - Footprint realism + circulation logic pass
Status: Done
**Acceptance**
- [x] Improve footprint deduplication so overlapping/near-identical polygon parts do not generate duplicate building bodies.
- [x] Ensure multi-part clicked/uploaded footprints are normalized into a single coherent connected cluster before generation.
- [x] Improve stairwell anchoring so `Corner`, `Edge`, and `Central / Near Core` positions map to true geometry-aware placements.
- [x] Strengthen circulation flow so elevator/stair service zones connect into lobby + corridor network before room bands are generated.
- [x] Add corridor-adjacent room wall openings by carving door cuts in partition rings where rooms intersect hallways.
- [x] Keep labels optional by not forcing any room-label rendering layer.

**Files**
- app.html

**Manual QA**
1. Click several complex buildings (including L/irregular footprints) and confirm only one coherent generated floorplate cluster appears.
2. Upload a MultiPolygon GeoJSON with overlapping parts; confirm duplicates are removed and output remains single coherent building logic.
3. Switch `Stair Position` between `Corner`, `Edge`, and `Central / Near Core`; confirm stairwell placement visibly moves to those zones.
4. Enter floorplan view and verify flow reads as elevators/stairs → lobby/link corridors → main corridors → rooms.
5. Confirm rooms adjacent to corridors show openings (not sealed rings everywhere) and no forced labels appear.

---

## BG-029 - Toolbar view mode framework + 360 orbit
Status: Done
**Acceptance**
- [x] Add a new toolbar `View` control designed to support multiple view options over time.
- [x] Add first view option: `360 Pan`, with explicit start/exit behavior.
- [x] Keep orbit camera pitch fixed to the app's load pitch.
- [x] Adapt framing distance by building scale (closer on smaller buildings, further on taller/larger buildings).
- [x] Ensure view mode exits cleanly and does not conflict with floorplan mode.

**Files**
- app.html

**Manual QA**
1. Click or upload a building and confirm `View...` + `Start view` appears in the toolbar.
2. Select `360 Pan` and click `Start view`; verify slow continuous rotation around the building.
3. Verify pitch remains consistent with load pitch during orbit.
4. Compare a short/small building and a tall/large building; verify taller/larger buildings frame farther out.
5. Click `Exit view` to stop and restore previous camera.
6. Enter floorplan mode while orbit was active and verify no camera-mode conflict.

---

## BG-030 - Style-preserving GeoJSON export for cross-map tilesets
Status: Done
**Acceptance**
- [x] Update GeoJSON export to include style attributes needed to preserve appearance in other maps after tileset upload.
- [x] Include per-feature color fields and explicit line thickness fields in exported properties.
- [x] Include radius-related styling metadata (edge radius / rounded roof) in exported properties.
- [x] Preserve a style manifest + config snapshot in export metadata for deterministic remapping.

**Files**
- app.html

**Manual QA**
1. Generate a building and click `Download GeoJSON`; confirm file name is `building-styled.geojson`.
2. Open the file and confirm each feature has `mbg_*` style properties such as `mbg_fill_color`, `mbg_line_width_m`, and `mbg_edge_radius_m`.
3. Confirm root metadata includes `mbg_export.styleByLayer` and `mbg_export.config`.
4. Upload output to a new map/tileset workflow and verify style fields are available for remapping in target layer paint rules.

---

## BG-031 - Consolidate toolbar view controls into one dropdown
Status: Done
**Acceptance**
- [x] Replace separate `View overlay` + `360 view` controls with one toolbar dropdown.
- [x] Implement checkmarked toggle-style menu items inside the dropdown.
- [x] Enforce non-independent behavior so only one mode can be active at a time.
- [x] Keep existing mode behavior (floorplan and 360 orbit) while switching via dropdown entries.
- [x] Preserve mobile usability for the new dropdown menu.

**Files**
- app.html

**Manual QA**
1. Click/select a building and confirm only one `View ▾` toolbar control appears.
2. Open dropdown and enable `View overlay`; verify checkmark appears and floorplan mode activates.
3. Open dropdown and enable `360 view`; verify floorplan exits, orbit starts, and only `360 view` remains checked.
4. Click checked option again to disable it; verify mode exits and no option remains checked.
5. Confirm dropdown opens/closes correctly on desktop and narrow/mobile viewport.

---

## BG-032 - Narrow right menu + Builder Mode default
Status: Done
**Acceptance**
- [x] Reduce right editor menu width by ~25% while preserving usability across breakpoints.
- [x] Add `Builder mode` to the unified View dropdown.
- [x] Make `Builder mode` the default active mode when no other view mode is active.
- [x] Keep view options mutually exclusive (`Builder mode`, `View overlay`, `360 view`).

**Files**
- app.html

**Manual QA**
1. Load app and confirm right editor menu appears noticeably narrower than previous build.
2. Select a building and open `View ▾`; confirm `Builder mode` is checked by default.
3. Enable `View overlay`; confirm `Builder mode` unchecks and overlay checks.
4. Enable `360 view`; confirm overlay exits and only `360 view` remains checked.
5. Re-select `Builder mode`; confirm orbit/overlay stop and Builder returns as active default.

---

## BG-033 - Multi-format 3D building export (GLB/GLTF/OBJ/STL)
Status: Done
**Acceptance**
- [x] Add export UI for selecting 3D format and exporting generated building geometry.
- [x] Implement GLB and GLTF exports with material/color/opacity preservation from active generated layers.
- [x] Implement OBJ and STL exports from the same generated geometry without external preprocessing.
- [x] Use active generated building layer styles for exported materials so files open directly in 3D editors.
- [ ] (FBX descoped due to library unavailability)

**Files**
- app.html

**Manual QA**
1. Generate a building and choose `GLB (.glb)` then click `Export 3D`; open in Blender and confirm geometry/materials appear directly.
2. Repeat for `GLTF (.gltf)` and verify material colors/opacity are retained.
3. Repeat for `OBJ (.obj)` and `FBX (.fbx)` and verify geometry imports immediately in editor.
4. Repeat for `STL (.stl)` and verify mesh imports (materials not expected for STL).
5. Compare exported model against active map view to confirm layer-driven look is maintained as closely as format allows.

---

## BG-034 - Render anti-artifact pass + export section polish + loader
Status: Done
**Acceptance**
- [x] Add anti-artifact improvement: per-layer vertical lift offsets to prevent coplanar z-fighting.
- [x] Add anti-artifact improvement: restrict texture overlays to primary envelope layers only.
- [x] Add anti-artifact improvement: reduce texture overlay intensity adaptively in tight/high-density footprints.
- [x] Reduce texture catalog to 25 curated options with explicit, context-rich names (facade/wall/roof/interior/accent).
- [x] Add a brand-aligned loading spinner overlay shown during click/upload/regenerate render workflows.
- [x] Place `Export preset` at the bottom of the export action list.
- [x] Group all export actions into a dedicated `Exports` section with cleaner hierarchy.
- [x] Fix bottom map overflow by pinning map viewport and preventing page scroll bleed.

**Files**
- app.html
- js/textures.js
- codex/TASKS.md

**Manual QA**
1. Click a dense building cluster and confirm reduced shimmer/moire and no obvious z-fighting between stacked layers.
2. Open `Wall texture`/`Roof texture` dropdowns and confirm exactly 25 clearly named options.
3. Click building, upload GeoJSON, and press `Regenerate Building`; confirm loading spinner appears during generation.
4. In the right panel, confirm `Exports` section contains `Download GeoJSON`, `Export 3D`, and `Export preset` (last).
5. Confirm there is no bottom map strip/overflow and no page-level scrolling around the map viewport.

---

## BG-035 - CAD-informed reliability and beauty improvement brief
Status: Done
**Acceptance**
- [x] Produce a book-grounded recommendation brief with five distinct improvements tailored to the current app architecture.
- [x] Each improvement includes an implementation-grade "extraordinary prompt" for direct execution.
- [x] Improvements explicitly target reliability, consistency, and visual quality.

**Files**
- codex/CAD_APPLICATION_IMPROVEMENTS.md

**Manual QA**
1. Open `codex/CAD_APPLICATION_IMPROVEMENTS.md` and confirm five numbered improvements are present.
2. Confirm each improvement includes one "Extraordinary prompt" block.
3. Confirm recommendations reference CAD principles (layers, snapping, plotting, BIM, troubleshooting discipline).

---

## BG-036 - Facade and external-shape refinement of CAD improvement brief
Status: Done
**Acceptance**
- [x] Restrict all CAD improvement recommendations to facade systems and external building shape.
- [x] Rebase recommendations on the attached DETAIL facades reference volume.
- [x] Keep exactly five improvements, each with an implementation-grade extraordinary prompt.
- [x] Exclude interior/circulation/floorplan-oriented recommendations.

**Files**
- codex/CAD_APPLICATION_IMPROVEMENTS.md
- codex/TASKS.md

**Manual QA**
1. Open `codex/CAD_APPLICATION_IMPROVEMENTS.md` and confirm scope lock explicitly states facade + external shape only.
2. Confirm five numbered improvements are present and all concern envelope/massing systems.
3. Confirm each improvement includes one "Extraordinary prompt" block.
4. Confirm references cite facade-focused sections from the attached DETAIL publication.

---

## BG-037 - Unified exterior-envelope system (field + profile + panel + climate + light)
Status: Done
**Acceptance**
- [x] Add deterministic Facade Pattern Field engine and route facade articulation controls through shared rhythm modifiers.
- [x] Add external massing profile library (`prismatic`, `soft-wave`, `crowned`, `podium-tower-merge`) integrated into `scale()`.
- [x] Add silhouette continuity scoring + envelope guard clamping for unstable crown/step combinations.
- [x] Add joint-aware facade panelization with panel/joint geometry layers and export metadata (`panel_id`, `joint_class`, `module_family`, `orientation`).
- [x] Add orientation-based climate facade zoning with presets and per-sector multipliers (`N/E/S/W`).
- [x] Add facade material-light choreography presets (`diffuse-soft`, `crisp-tectonic`, `luminous-metal`) with hierarchy-aware radiance/contrast budgets.
- [x] Keep scope to facade/external envelope logic only; no new interior planning behavior introduced.

**Files**
- app.html
- codex/TASKS.md

**Manual QA**
1. Generate a building and toggle `Facade Pattern Mode` + `Facade Seed`; confirm deterministic repeatability for same seed and coherent variation across facade systems.
2. Switch `Massing Profile` values and verify smooth silhouette changes without abrupt roof/crown breaks.
3. Enable/disable `Enable Panelization`; confirm visible `facadePanels` / `facadeJoints` layers and panel metadata in exported GeoJSON.
4. Change `Climate Facade Mode` and sector multipliers (`North/East/South/West`); confirm directional differences in facade openness/shading read.
5. Switch `Facade Light Mode`; confirm hierarchy readability at close-up and wide zoom without over-contrast noise.
6. Verify click-to-generate, upload-to-generate, `Download GeoJSON`, and `Export 3D` still function without console errors.

---

## BG-038 - Consolidate facade articulation UI and hide abstract envelope controls
Status: Done
**Acceptance**
- [x] Merge ribs + exoskeleton + paneling concept into one unified `Facade Systems` section.
- [x] Remove abstract controls from visible UI: `Facade Pattern Mode`, `Facade Seed`, `Climate Facade Mode`, `Facade Light Mode`, `Enable Panelization`, `Panel Module Family`, `Panel Orientation`, `Joint Width (mm)`.
- [x] Keep generation stable by using internal defaults for removed controls in `cfg()`.
- [x] Remove old duplicate sectioning (`Vertical Elements`) to reduce confusion.

**Files**
- app.html
- codex/TASKS.md

**Manual QA**
1. Open the editor and confirm there is one `Facade Systems` section containing windows/mullions, ribs, exoskeleton, and a paneling note.
2. Confirm the removed abstract controls are no longer visible.
3. Click building / upload GeoJSON and regenerate; confirm no console errors.
4. Confirm `Download GeoJSON` and `Export 3D` still work.

---

## BG-039 - Add punched window facade style toggle
Status: Done
**Acceptance**
- [x] Add `windowStyle` UI control under `Facade Systems` with `ribbon` and `punched` options.
- [x] Add `punchedWindowSpacing` and `punchedWindowWidth` controls and wire into `cfg()`.
- [x] Update preset mapping for new window-style parameters.
- [x] Keep existing ribbon window logic intact and gated under `windowStyle === 'ribbon'`.
- [x] Add procedural punched-window generation branch using facade segments with corner margins, spacing, recessed footprints, and border frames.
- [x] Force opaque facade treatment when `windowStyle === 'punched'` by setting `facadeAlpha` to `1` in config.

**Files**
- app.html
- codex/TASKS.md

**Manual QA**
1. Set `Window Style` to `Ribbon`; verify behavior matches current ribbon-window output.
2. Set `Window Style` to `Punched`; verify isolated windows with solid wall between openings.
3. Adjust `Punched Window Spacing` and `Punched Window Width`; verify count and size respond predictably.
4. Confirm corners remain mostly solid (no windows pinned directly to vertices).
5. Confirm GeoJSON and 3D exports include windows/borders without pipeline changes.

---

## BG-040 - Refine punched windows for masonry negative-space + remove massing profile control
Status: Done
**Acceptance**
- [x] Remove `Massing Profile` from UI and force internal profile to `prismatic` for stable facade attachments.
- [x] Improve punched-window generation to emphasize negative space, recessed openings, and strong corner solids.
- [x] Generate broad punched-window surrounds as wall-colored facade reveals (same styling intent as core facade).
- [x] Keep ribbon style logic intact and switchable via `windowStyle`.

**Files**
- app.html
- codex/TASKS.md

**Manual QA**
1. Switch `Window Style` to `Punched`; verify isolated openings with substantial opaque wall between windows.
2. Increase `Window Border Width`; verify broad seamless reveals around windows rendered in facade wall color.
3. Verify facade corners remain visually solid across rectangular and irregular footprints.
4. Confirm `Ribbon` mode still reproduces continuous-glazing behavior.

---

## BG-041 - Make facade components taper-aware (ribs, exoskeleton/lattice, punched windows)
Status: Done
**Acceptance**
- [x] Make facade component sizing/density respond to per-floor taper so facade attachments stay coherent as floor plates shrink/expand.
- [x] Scale punched-window width/spacing/reveal sizing by taper-aware floor factor to preserve masonry negative space at upper tapered floors.
- [x] Make rib spacing/count/depth taper-aware to avoid over-dense or disconnected rib placement on reduced shells.
- [x] Implement exoskeleton/lattice geometry generation per tapered floor shell (instead of static footprint assumptions) so members remain attached through taper transitions.
- [x] Add clamp guards for facade component controls (`windowSpacing`, `windowWidth`, `exoSize`, `exoOffset`, `exoDensity`) to prevent out-of-range geometry.

**Files**
- app.html
- codex/TASKS.md

**Manual QA**
1. Set `Taper Mode` to `continuous` with stronger taper and enable ribs; verify ribs remain aligned to facade edges on all floors.
2. Switch `Window Style` to `Punched`; verify spacing/width/reveals stay proportional on both lower and upper tapered floors.
3. Set `Structure Type` to `Vertical` and then `Lattice`; verify exoskeleton members follow each tapered floor outline without visible detachment.
4. Verify click-generate and upload-generate still run with no console errors.

---

## BG-042 - Add web-first AR parcel placement page
Status: Done
**Acceptance**
- [x] Create a separate `ar.html` page that renders generated building geometry in a camera-backed AR-capable web session.
- [x] Add `Open AR Viewer` action in main app export section to stage current building payload and parcel centroid for AR.
- [x] Place AR model by geographic offset from user location to clicked parcel coordinates (no visible analysis/bounding box overlay).
- [x] Add sensor controls (geolocation + heading), recenter, and trim controls for practical field alignment.
- [x] Keep a desktop/non-AR preview path so geometry can be validated before mobile field use.

**Files**
- app.html
- ar.html
- codex/TASKS.md

**Manual QA**
1. Generate a building from a clicked parcel and press `Open AR Viewer`; confirm `ar.html` opens and target coordinates are populated.
2. On mobile (HTTPS + AR-capable browser), tap `Enable Sensors` then `Start AR Session`; confirm camera feed appears with model placed relative to parcel location.
3. Confirm no parcel bbox or helper geometry is rendered in AR view.
4. Use `Yaw trim`, `Height offset`, and `Recenter` and verify model alignment can be adjusted in the field.

---

## BG-043 - Harden AR payload staging and loading for large models
Status: Done
**Acceptance**
- [x] Replace AR payload staging primary path from `localStorage` to `IndexedDB` to avoid quota failures on complex buildings.
- [x] Keep backward-compatible fallback to `localStorage` when IndexedDB is unavailable.
- [x] Update `ar.html` payload load path to read from `IndexedDB` first, then fallback to localStorage.
- [x] Preserve existing geospatial placement behavior and controls.

**Files**
- app.html
- ar.html
- codex/TASKS.md

**Manual QA**
1. Generate a high-complexity building and tap `Open AR Viewer`; confirm no storage quota error appears.
2. Confirm `ar.html` loads payload and displays target coordinates.
3. In AR, verify position responds to live geolocation updates and heading/yaw trim adjustments.

---

## BG-044 - Prepare Vercel production deployment for mobile AR testing
Status: Blocked (awaiting Vercel auth)
**Acceptance**
- [x] Add `vercel.json` routing so `/` resolves to `app.html` and `/ar` resolves to `ar.html`.
- [x] Add AR-relevant `Permissions-Policy` header for camera/geolocation/XR capabilities on `/ar`.
- [x] Attempt production deploy from workspace.
- [ ] Complete live deployment and return production URL.

**Files**
- vercel.json
- codex/TASKS.md

**Manual QA**
1. Run `npx vercel login` or provide `VERCEL_TOKEN`.
2. Run `npx vercel deploy --prod --yes` from repo root.
3. Open resulting URL on phone and verify `/` loads generator and `/ar` loads AR viewer.

---

## BG-045 - Improve mobile controls and camera-overlay AR usability
Status: Done
**Acceptance**
- [x] Convert mobile customizer in `app.html` from obstructive side panel to bounded bottom sheet.
- [x] Add standard phone camera feed behind `ar.html` Three.js overlay so AR works even without immersive WebXR support.
- [x] Add compact mobile HUD behavior for `ar.html` with minimize/expand control.
- [x] Use parcel/model size to enforce a readable minimum visual placement distance when user is too close to the site target.
- [x] Preserve live GPS + heading alignment for the building overlay.

**Files**
- app.html
- ar.html
- codex/TASKS.md

**Manual QA**
1. Open `app.html` on a phone and confirm the customizer opens as a bottom sheet instead of covering the entire map.
2. Open `ar.html` on a phone, enable sensors, and confirm the rear camera feed is visible with the building overlay drawn on top.
3. Stand very near the target parcel and verify the overlay remains visually readable rather than collapsing into the camera.
4. Toggle the AR HUD minimized/expanded and confirm it does not block the camera view.

---

## BG-046 - Restore mobile-first full map view with top toolbar access
Status: Done
**Acceptance**
- [x] Keep mobile map largely unobstructed on initial load.
- [x] Preserve geocoder access in a compact top toolbar on mobile.
- [x] Move utility cards (`Building Generator`, `Show 3D`, `Multi-building`, `Custom Footprint`) into the editor menu on mobile so they remain available without occupying map space.
- [x] Reposition menu toggle to the top toolbar zone on mobile.

**Files**
- app.html
- codex/TASKS.md

**Manual QA**
1. Load the app on a phone and confirm the map is visible edge-to-edge except for the compact top toolbar.
2. Confirm the geocoder remains usable from the top toolbar.
3. Tap `Open Menu` and verify the hidden utility cards appear inside the editor sheet.
4. Rotate or resize back to desktop width and confirm those cards return to the left/top stack.

---

## BG-047 - Switch AR viewer to fixed geospatial placement
Status: Done
**Acceptance**
- [x] Remove visible manual model transform controls from `ar.html`.
- [x] Render building at its exact geospatial offset with no artificial minimum-distance repositioning.
- [x] Drive fallback camera-overlay orientation from device yaw/pitch/roll instead of a heading-only world rotation.
- [x] Extend depth precision/range for long-distance skyline viewing.

**Files**
- ar.html
- codex/TASKS.md

**Manual QA**
1. Stand across the street from a generated target and confirm the building remains fixed to the parcel instead of hovering at an arbitrary readable distance.
2. Pan the phone up/down/left/right and confirm the model stays locked in place relative to the real world.
3. Test from a long distance viewpoint and confirm the building remains visible without near/far clipping artifacts.

---

## BG-048 - Stabilize AR parcel lock with anchor altitude + projection tuning
Status: Done
**Acceptance**
- [x] Stop small geolocation jitter from shifting the model by locking placement to a stable user anchor until explicit recenter.
- [x] Add terrain/altitude-based vertical correction so the building base lands closer to true ground elevation in the AR overlay.
- [x] Smooth device-orientation updates and widen the fallback camera projection so distant targets read farther away instead of appearing unnaturally close.
- [x] Preserve fixed parcel placement behavior and keep manual placement transforms out of the AR UI.

**Files**
- ar.html
- codex/TASKS.md

**Manual QA**
1. Open `ar.html` on phone, enable sensors, then hold the device mostly still; confirm the model no longer jumps laterally with small sensor/GPS noise.
2. Test from an upper-floor or elevated viewpoint and confirm the building base sits lower in frame than before rather than floating well above street grade.
3. View a target several blocks away and confirm it reads farther back in the scene than the previous build, with a more convincing perspective scale.
4. Tap `Recenter Now` only after physically changing position and confirm the parcel lock updates intentionally rather than drifting continuously.

---

## BG-049 - Add fixed-position parcel lock and manual bind calibration for AR
Status: Done
**Acceptance**
- [x] Keep AR placement frozen to a fixed anchor by default so live geolocation updates do not keep dragging the model while the viewer moves the phone.
- [x] Correct the vertical placement formula so ground alignment no longer adds an extra eye-height offset on top of terrain elevation.
- [x] Add a manual bind workflow in `ar.html` that lets the user drag the building into exact view alignment and then keep those offsets locked.
- [x] Add compact depth/lateral/elevation nudge controls for cases where parcel placement still needs manual correction from a real-world viewpoint.

**Files**
- ar.html
- codex/TASKS.md

**Manual QA**
1. Open AR on phone and confirm `Fixed Position: On` is enabled by default; verify the model no longer shifts from ordinary live GPS watch updates.
2. Stand at ground level near a target parcel and confirm the building base sits lower than before instead of floating above grade.
3. Enter `Bind Building`, drag the model into the correct screen location, tap `Done Binding`, then pan the phone and confirm the manual bind offsets persist.
4. Use `Back 5m`, `Forward 5m`, and `Down 2m` to correct residual depth/elevation error and confirm `Reset Bind` returns to the raw parcel anchor.

---

## BG-050 - Begin native AR bridge from the web app
Status: Done
**Acceptance**
- [x] Add a web-app action that stages the generated building as an on-origin GLB plus parcel metadata for a native AR handoff.
- [x] Add a dedicated `native-ar.html` handoff page that loads the staged package and exposes a device-specific launch path.
- [x] Add a service worker that serves staged GLB/manifest files from the site path so Android Scene Viewer can request them as first-party HTTPS assets.
- [x] Keep Web AR available as a fallback while iPhone-native Quick Look remains blocked on USDZ export.

**Files**
- app.html
- native-ar.html
- sw-ar-assets.js
- codex/TASKS.md

**Manual QA**
1. Generate a building and tap `Open Native AR Beta`; confirm the handoff page opens and shows staged asset + manifest URLs.
2. On Android, tap `Launch Native AR` and confirm the page attempts to open Google Scene Viewer using the staged GLB URL.
3. Tap `Open Web AR Fallback` and confirm the previously staged parcel-aware web AR flow still opens correctly.
4. Reload the native handoff page on the same device and confirm the service worker still serves the staged manifest/GLB package.

---

## BG-051 - Add Apple USDZ native handoff and optional companion wrapper scaffolding
Status: Done
**Acceptance**
- [x] Add `USDZ` to the direct 3D export options using the same Three.js geometry pipeline as GLB export.
- [x] Stage both `.glb` and `.usdz` assets for the native handoff flow so Android Scene Viewer and iPhone Quick Look can both launch from `native-ar.html`.
- [x] Extend the staged manifest with native-companion wrapper metadata for geospatial anchors and persistent world tracking.
- [x] Add explicit ARKit and ARCore companion launch hooks plus a wrapper contract document for future native shells.

**Files**
- app.html
- native-ar.html
- native/COMPANION_WRAPPERS.md
- codex/TASKS.md

**Manual QA**
1. Choose `USDZ (.usdz)` in the 3D export dropdown and confirm the generator downloads a `.usdz` file.
2. Tap `Open Native AR Beta` on iPhone and confirm the handoff page shows both the GLB and USDZ asset URLs.
3. Tap `Launch Native AR` on iPhone Safari and confirm the page attempts to open AR Quick Look using the staged USDZ asset.
4. Tap `ARKit Companion` or `ARCore Companion` and confirm the browser attempts to open the corresponding custom URL scheme with the manifest URL attached.

---

## BG-052 - Redesign AR surfaces for production presentation
Status: Done
**Acceptance**
- [x] Replace the utilitarian AR overlays in `ar.html` and `native-ar.html` with a more polished visual language built for mobile presentation.
- [x] Keep the camera view dominant in `ar.html` while preserving control access and readability on small screens.
- [x] Make `native-ar.html` read as a coherent launch surface for Android native, iPhone native, companion wrappers, and web fallback.
- [x] Preserve all existing AR controls and payload behaviors while improving typography, spacing, and atmosphere.

**Files**
- ar.html
- native-ar.html
- codex/TASKS.md

**Manual QA**
1. Open `ar.html` on phone and confirm the camera remains dominant while the top hero and bottom control deck remain legible and compact.
2. Enter and exit `Bind Building` mode and confirm the design visibly reflects the calibration state.
3. Open `native-ar.html` and confirm the staged-package details, launch actions, and download links are readable on both desktop and mobile.
4. Confirm no AR controls disappeared during the redesign and that the pages still function normally.

---

## BG-053 - Streamline AR overlay and improve fallback startup + grounding
Status: Done
**Acceptance**
- [x] Remove the obstructive top AR hero/header from `ar.html` so the camera view remains clear.
- [x] Auto-attempt camera, geolocation, and motion startup on page load, while still handling browsers that require a user gesture for motion access.
- [x] Upgrade the fallback renderer to a more cinematic physical-material + ACES daylight look.
- [x] Add a local ground-plane tracking heuristic to the fallback placement path so nearby targets sit closer to the viewer’s street plane instead of floating from raw DEM differences.

**Files**
- ar.html
- codex/TASKS.md

**Manual QA**
1. Load `ar.html` on phone and confirm the top overlay is gone and the camera remains largely unobstructed.
2. Confirm camera and location permission prompts attempt on load; on iPhone, verify one tap on the live view completes motion access when required.
3. Compare the model against the previous build and confirm the rendering reads warmer, richer, and less flat.
4. Test a nearby parcel and confirm the building base sits closer to the local ground plane than before without requiring immediate manual downward correction.

---

## BG-054 - Lower AR baseline and make app shell/view menu fully responsive
Status: Done
**Acceptance**
- [x] Lower the default AR model baseline by 12m while preserving manual bind controls and reset behavior.
- [x] Remove common horizontal overflow risks from `app.html` by tightening panel widths, toolbar sizing, export row layout, and button overflow rules.
- [x] Keep the map and editor menu usable on narrow screens without side-scrolling or clipped controls.
- [x] Add `AR view` as an option in the existing view menu beside builder, floorplan, and 360 flows.

**Files**
- ar.html
- app.html
- codex/TASKS.md

**Manual QA**
1. Open `ar.html` and confirm the model starts 12m lower than the previous build before any manual calibration.
2. Tap `Reset Bind` and confirm the model returns to the new lowered default baseline rather than the older zero-offset anchor.
3. Open `app.html` on a narrow phone viewport and confirm the top bar, geocoder, view menu, export rows, and right-side editor menu do not force horizontal scrolling.
4. Generate a building, open the `View` menu, and confirm `AR view` appears and launches the native AR handoff flow.

---

## BG-055 - Add AR ground-lock proof mesh and georeferenced outline lights
Status: Done
**Acceptance**
- [x] Add a ground-acknowledgement visual in `ar.html` that animates only once terrain/site grounding data is available.
- [x] Drive the proof effect from the exported parcel/model footprint rather than a generic bounding helper.
- [x] Add faint yellow runway-style outline lights along the georeferenced model perimeter in the camera overlay.
- [x] Preserve existing AR placement, bind controls, and parcel lock behavior.

**Files**
- ar.html
- codex/TASKS.md

**Manual QA**
1. Generate a building and open `ar.html`; confirm the existing model placement and controls still work as before.
2. Allow camera and geolocation access, then wait for ground tracking to resolve; confirm a flowing footprint mesh fades in only after the ground lock is acknowledged.
3. Confirm faint yellow dots appear along the actual model outline at the parcel location instead of a loose rectangular helper.
4. Enter `Bind Building` mode and verify the proof mesh and outline lights move with the same parcel/model transform as manual calibration.

---

## BG-056 - Align AR HUD with control-desk brand and replace bind nudges with dials
Status: Done
**Acceptance**
- [x] Reduce the runway-style outline dots in `ar.html` to a subtler presentation with smaller size and lower opacity.
- [x] Replace the old bind nudge button row with directional dial controls and live bind-offset readouts.
- [x] Add bind step presets so calibration movement is legible instead of feeling arbitrary.
- [x] Restyle the AR HUD to match the IBM Plex / Source Serif control-desk language used in `app.html` and the homepage.

**Files**
- ar.html
- codex/TASKS.md

**Manual QA**
1. Open `ar.html` and confirm the panel styling, typography, and button treatment read consistently with `app.html` and the root landing page.
2. Enter `Bind Building` mode and confirm the previous nudge row is replaced by directional dials plus live depth/lateral/elevation readouts.
3. Switch between `Fine`, `Site`, and `Block` step presets and confirm dial movement changes accordingly.
4. Confirm the yellow outline dots are visibly smaller and fainter than the previous pass while still tracing the georeferenced model perimeter.

---

## BG-057 - Add project commitment document for fidelity, mapping accuracy, and UX
Status: Done
**Acceptance**
- [x] Add a detailed markdown document describing the project’s commitment to accurate 3D fidelity.
- [x] Explicitly cover mapping accuracy and geospatial honesty as first-class standards.
- [x] Explicitly cover user experience expectations for a complex web application.
- [x] Place the document with the existing project notes in `codex/`.

**Files**
- codex/PROJECT_COMMITMENT.md
- codex/TASKS.md

**Manual QA**
1. Open `codex/PROJECT_COMMITMENT.md` and confirm it is a detailed project-level statement rather than a short note.
2. Confirm the document includes separate sections for 3D fidelity, mapping accuracy, and user experience.
3. Confirm the closing language frames trust, accuracy, and usability as concurrent standards for the project.

---

## BG-058 - Prioritize georeferenced iPhone AR over Quick Look preview
Status: Done
**Acceptance**
- [x] Stop presenting iPhone Quick Look as the primary parcel-aligned AR path when launched from `native-ar.html`.
- [x] Route the primary iPhone launch action to the existing georeferenced `ar.html` viewer that uses the staged parcel payload.
- [x] Keep Quick Look available as an explicit secondary preview path with copy that it is plane-based rather than geospatially anchored.
- [x] Update the handoff copy so the iPhone launch surface is honest about geospatial accuracy limits.

**Files**
- native-ar.html
- codex/TASKS.md

**Manual QA**
1. Open `native-ar.html` on an iPhone and confirm the primary action is `Open Georeferenced Web AR`.
2. Confirm the separate `Open Quick Look Preview` action still launches the staged USDZ asset from Safari.
3. Confirm the iPhone copy no longer implies Quick Look is parcel-locked or geospatially anchored.

---

## BG-059 - Add parcel-corner lock workflow and local site map to Web AR
Status: Done
**Acceptance**
- [x] Add a 100m x 100m local site map to `ar.html` showing the parcel outline, current model outline, user position, and camera heading cone.
- [x] Allow the user to select a parcel corner from that map and arm a corner-lock workflow.
- [x] Let the user tap the matching real-world corner in the live camera view to solve the selected parcel corner onto the ground plane.
- [x] Keep the model fixed to that solved corner after the tap, independent of later camera movement.

**Files**
- ar.html
- codex/TASKS.md

**Manual QA**
1. Open `ar.html`, enter `Bind Building`, and confirm a 100m x 100m site map appears with parcel/model outlines, a user marker, and a heading cone.
2. Tap a numbered parcel corner on the site map and confirm the `Selected Corner` readout updates.
3. Tap `Arm Corner Lock`, then tap the matching parcel corner in the live camera view; confirm the model snaps so that corner stays fixed as the phone moves.
4. Confirm the existing bind dials still work for residual adjustment after a corner lock, and `Reset Bind` returns the model to its baseline placement.

---

## BG-060 - Simplify Web AR editor controls and clean site-lock map
Status: Done
**Acceptance**
- [x] Remove the confusing bind-step and dial terminology from `ar.html` and reduce the editor language to lock building, reposition model, and reset viewpoint.
- [x] Simplify the reposition UI so movement is clearly camera-relative and uses plain labels such as toward, away, left, and right.
- [x] Clean the site-lock map so it only shows the corner targets and camera markers, without the extra outline artifacts.
- [x] Preserve the improved parcel stability from the corner-lock workflow while making the control surface easier to understand.

**Files**
- ar.html
- codex/TASKS.md

**Manual QA**
1. Open `ar.html` and confirm the main editing language now reads `Lock Building`, `Reposition Model`, and `Reset Viewpoint`.
2. Enter `Reposition Model` and confirm the map only shows camera markers and parcel corners, without the old outline artifacts.
3. Use `Toward You`, `Away`, `Left`, and `Right` and confirm movement is relative to the current camera view rather than global cardinal directions.
4. Confirm `Lock to Corner` still pins the building to the selected parcel corner and `Reset Model Position` returns the model to its baseline.

---

## BG-061 - Remove Web AR map widget, remove runway dots, and improve default first-load visibility
Status: Done
**Acceptance**
- [x] Remove the site-map widget and its related corner-lock controls from `ar.html`.
- [x] Remove the dotted runway-style lights from beneath the AR model while preserving the remaining proof mesh.
- [x] Ensure the model appears immediately when the Web AR viewer opens, without requiring manual position configuration.
- [x] Shift the default first-load placement 5 meters farther away from the camera than the previous starting position.

**Files**
- ar.html
- codex/TASKS.md

**Manual QA**
1. Open `ar.html` and confirm the map widget and corner-lock controls are no longer present.
2. Confirm the proof mesh still renders but the dotted lights beneath the model are gone.
3. Open the Web AR viewer fresh and confirm the model is already visible without manual repositioning.
4. Confirm the initial load and `Reset Model Position` both place the model about 5 meters farther away from the camera than the previous default.

---

## BG-062 - Preserve iOS motion permission gesture in Web AR startup
Status: Done
**Acceptance**
- [x] Update `ar.html` so a user-initiated sensor enable requests device orientation permission before awaited camera or geolocation work breaks the gesture chain.
- [x] Preserve the existing deferred unlock flow for browsers that auto-start camera and location before the user taps.
- [x] Keep model startup behavior intact so the AR model can appear after the permission prompt instead of failing behind the gesture error.

**Files**
- ar.html
- codex/TASKS.md

**Manual QA**
1. Open `ar.html` on iPhone Safari and tap `Enable Sensors`.
2. Confirm the motion permission prompt appears without the `requires a user gesture` error.
3. Grant camera, location, and motion access and confirm the model appears without needing an extra code-path fix or reload.
4. Reload and confirm the non-user-initiated auto-start path still defers motion unlock until the next tap when needed.

---

## BG-063 - External fidelity pass for imagined building renders
Status: Done
**Acceptance**
- [x] Reorient the generator editor around external building intent, massing, facade, balconies, podium, roof, transparency, and GeoJSON export.
- [x] Add building-type and facade-type controls that apply coherent exterior defaults instead of making the user coordinate unrelated controls by hand.
- [x] Add a global transparency mode that balances facade, window, texture, rib, balcony, lattice, roof, and internal-layer visibility.
- [x] Replace independent all-control randomization with archetype-based exterior randomization using coherent palettes and compatible feature combinations.
- [x] De-emphasize secondary AR, account, GLB bulk, raw climate, and visual-only internal controls from the primary workflow.
- [x] Extend styled GeoJSON export metadata and feature properties with building type, transparency mode, layer, part, floor, base, top, height, final color, opacity, and pattern fields.
- [x] Add a concurrent review file with an honest opinion of the code and output against the core objective.

**Files**
- app.html
- codex/TASKS.md
- codex/BUILDING_GENERATOR_REVIEW.md

**Manual QA**
1. Open `app.html`, select each building type, and confirm the exterior controls change to coherent defaults.
2. Click or upload a footprint, test all transparency modes, and confirm exterior features remain legible.
3. Use `Randomize Exterior` for each archetype and confirm the result feels intentional rather than chaotic.
4. Download GeoJSON and confirm features include `mbg_building_type`, `mbg_transparency_mode`, `mbg_part`, `mbg_floor`, `mbg_base_m`, `mbg_top_m`, and `mbg_height_m`.
5. Confirm AR/account/GLB/internal controls no longer dominate the primary editor workflow.

---

## BG-064 - Consolidate exterior systems and improve architectural fidelity
Status: Done
**Acceptance**
- [x] Replace separate panel, rib, and exoskeleton decisions with one facade articulation system covering none, panel grid, vertical fins, expressed frame, and lattice screen.
- [x] Make articulation density, projection, member width, and color affect the selected facade system without activating competing systems.
- [x] Add punched-window proportions, darker recess surrounds, and projecting sill geometry so masonry reads as solid wall with openings.
- [x] Replace generic separators with frequency-aware recessed joints, slab edges, spandrel bands, and belt courses.
- [x] Rebuild balconies as facade-oriented bays with width control, realistic slab thickness, and railings limited to exposed edges.
- [x] Add standard, screened mechanical, terraced, green, and tapered roof assemblies as styled and exportable geometry.
- [x] Make internal slabs, cores, stairs, elevators, and floorplans opt-in while giving Solid, Balanced, X-Ray, and Exterior Only distinct whole-building visibility behavior.
- [x] Constrain each building archetype and curated preset to compatible exterior systems and keep internal systems disabled by default.
- [x] Preserve the new facade, window, band, balcony, and roof layers in styled GeoJSON with architectural part, layer, height, color, opacity, and pattern metadata.
- [x] Group repeated panel, joint, fin, and structural geometry into render-equivalent MultiPolygons so detail does not require thousands of redundant standalone features.
- [x] Add an executable external-fidelity check covering controls, presets, geometry scenarios, every primary exterior control group's parameter sensitivity, transparency modes, mobile/legacy-flow guards, and styled GeoJSON output.
- [x] Update the concurrent code/output review with direct limits of the 2.5D GeoJSON approach.

**Files**
- app.html
- presets/defaults.json
- scripts/check_external_fidelity.mjs
- codex/BUILDING_GENERATOR_REVIEW.md
- codex/TASKS.md

**Automated QA**
1. Run `node scripts/check_external_fidelity.mjs`; confirm all six geometry scenarios, all eight presets, two randomized samples for each archetype, the exterior parameter-sensitivity matrix, mobile/legacy-flow guards, all transparency assertions, and styled GeoJSON assertions pass.
2. Run `node scripts/check_external_fidelity.mjs --render-dir output/external-fidelity`; inspect the six exact-geometry axonometric renders for facade, balcony, lattice, and roof composition.
3. Run the JavaScript module syntax check and `php -l app.html`; confirm both pass.
4. Request `http://localhost:8000/app.html` and `http://localhost:8000/presets/defaults.json`; confirm both return HTTP 200.

**Manual QA**
1. Click a Mapbox footprint and upload Polygon and MultiPolygon GeoJSON; confirm both use the consolidated exterior controls.
2. Inspect masonry, office, residential, glass, mixed-use, and industrial results at several bearings and zoom levels.
3. Test all transparency modes and confirm the envelope remains legible while X-Ray prioritizes explicitly enabled internal layers.
4. Randomize every building type twice and confirm balconies never compete with lattice or expressed-frame presets.
5. Download styled GeoJSON and confirm the new window sill, facade articulation, band, balcony, and roof assembly layers are present.

**Browser QA Note**
- In-app browser navigation to the local server was denied by the browser security policy during this implementation pass. Exact-geometry axonometric renders were generated and inspected, and automated geometry/export QA passed; release Mapbox texture, interaction, mobile, and console inspection still need a permitted local browser session.

---

## BG-065 - Prevent default transparency from ghosting the building envelope
Status: Done
**Acceptance**
- [x] Make Solid mode fully opaque for every exterior layer and hide internal systems.
- [x] Keep Balanced structural skins, podiums, facade panels, details, and roof geometry in a safe opaque range while retaining readable glass.
- [x] Make Exterior Only opaque and reserve complete-building translucency for X-Ray mode.
- [x] Preserve facade-opacity adjustment inside Balanced without allowing low component values to turn the building into a ghosted stack of slabs.
- [x] Add executable opacity assertions across core, podium, facade panels, ribs, lattice, balconies, and roof layers.
- [x] Regenerate and inspect exact-geometry output after the opacity change.

**Files**
- app.html
- scripts/check_external_fidelity.mjs
- codex/TASKS.md

**Automated QA**
1. Run `node scripts/check_external_fidelity.mjs`; confirm all transparency-mode and envelope-opacity assertions pass.
2. Run the JavaScript module syntax check and `php -l app.html`.
3. Request `http://localhost:8000/app.html` and confirm HTTP 200.

**Manual QA**
1. Hard-refresh `app.html`, regenerate a residential or mixed-use building, and confirm Balanced mode no longer reveals the map through the whole tower.
2. Confirm Solid and Exterior Only are opaque, while X-Ray intentionally reveals enabled internal layers.

---

## BG-066 - Stabilize facade solidity and clarify articulation sizing
Status: Done
**Acceptance**
- [x] Prevent facade climate metadata from lowering the actual wall-shell opacity after a facade-type change.
- [x] Keep punched masonry and concrete wall shells visually solid in Balanced and Solid modes.
- [x] Replace panel-grid density scaling with a direct panel module width control.
- [x] Give fin, frame, and lattice density controls explicit system-specific labels and a useful default.
- [x] Add executable regression assertions for wall opacity and panel-grid sizing.

**Files**
- app.html
- scripts/check_external_fidelity.mjs
- codex/TASKS.md

**Automated QA**
1. Run `node scripts/check_external_fidelity.mjs`.
2. Run the JavaScript module syntax check and `php -l app.html`.

**Manual QA**
1. Change among every facade type and confirm the wall shell remains visible.
2. Select Panel grid and confirm Panel Module Width visibly changes panel spacing.
3. Select fins, expressed frame, and lattice and confirm the density label describes the selected system.

---

## BG-067 - Restore direct facade and window opacity control
Status: Done
**Acceptance**
- [x] Add a Manual opacity transparency mode that uses facade and window opacity values directly.
- [x] Switch to Manual opacity and re-render when either opacity input changes.
- [x] Allow opacity values down to zero without a hidden render-time floor.
- [x] Keep facade opacity visible and configurable for punched-window facades.
- [x] Remove the forced opaque punched-facade override.
- [x] Preserve Solid, Balanced, X-Ray, and Exterior Only as explicit view presets.
- [x] Add regression assertions for direct facade/window opacity behavior.

**Files**
- app.html
- scripts/check_external_fidelity.mjs
- codex/TASKS.md

**Automated QA**
1. Run `node scripts/check_external_fidelity.mjs`.
2. Run the JavaScript module syntax check and `php -l app.html`.
3. Confirm `http://localhost:8000/app.html` returns HTTP 200.

---

## BG-074 - Improve preset legibility, compact map tools, and repair punched glazing
Status: Done
**Acceptance**
- [x] Raise authored facade and window opacity across all 20 advanced presets while preserving transparent and opaque material families.
- [x] Consolidate the top-left site, context, selection, and footprint tools into one compact hideable menu.
- [x] Reduce the general map and editor typography scale without reducing control usability.
- [x] Keep the unified site menu responsive by moving it as one unit into the mobile editor.
- [x] Render punched windows with their selected glazing color instead of the fixed glass texture.
- [x] Ensure punched facade defaults use Manual opacity so window opacity remains adjustable.
- [x] Keep ribbon windows textured and preserve the punched-window treatment in styled GeoJSON export.

**Files**
- app.html
- presets/defaults.json
- scripts/build_advanced_presets.mjs
- scripts/check_external_fidelity.mjs
- codex/TASKS.md

**Automated QA**
1. Run `node scripts/build_advanced_presets.mjs` and confirm it writes exactly 20 candidates.
2. Run `node scripts/check_external_fidelity.mjs`.
3. Run the JavaScript module syntax check, `php -l app.html`, and `node scripts/lint_tokens_only.mjs`.
4. Confirm `http://localhost:8000/app.html` and `http://localhost:8000/presets/defaults.json` return HTTP 200.

---

## BG-075 - Complete podium perimeter coverage
Status: Done
**Acceptance**
- [x] Style storefront glazing and piers around every polygon component produced by a podium footprint or buffer.
- [x] Add a continuous recessed perimeter backing behind podium glazing so unstyled voids cannot expose an empty base.
- [x] Preserve the entrance and visible lobby by carving their path from the perimeter backing.
- [x] Preserve component metadata in podium storefront features for GeoJSON inspection.
- [x] Add disconnected-footprint regression coverage for storefront and backing completeness.

**Files**
- app.html
- scripts/check_external_fidelity.mjs
- codex/TASKS.md

**Automated QA**
1. Run `node scripts/check_external_fidelity.mjs`.
2. Generate deterministic renders and inspect `disconnected-podium-perimeter.svg`.
3. Run the JavaScript module syntax check, `php -l app.html`, and `node scripts/lint_tokens_only.mjs`.
4. Confirm `http://localhost:8000/app.html` returns HTTP 200.

---

## BG-076 - Production AR fidelity, stability, lighting, and occlusion
Status: Done
**Acceptance**
- [x] Version the app-to-AR payload and carry current podium, roof, facade, structural, circulation, and interior layers with authored style metadata.
- [x] Carry a bounded set of neighboring Mapbox buildings into AR as depth-only geospatial occluders.
- [x] Replace first-sample GPS placement with filtered settling, reject poor outliers, and persist parcel-specific manual calibration.
- [x] Remove the hidden downward baseline and camera-relative field-placement offsets.
- [x] Request runtime WebXR anchors, hit testing, light estimation, and depth sensing when supported, with truthful fallbacks when unavailable.
- [x] Add environment-matched PBR materials, camera-derived fallback lighting, solar direction, soft shadows, and contact grounding.
- [x] Merge compatible geometry, restore frustum culling, add distance LOD, expose quality modes, and adapt pixel density to frame time.
- [x] Make mapped-building and sensor-depth occlusion capability visible in the compact camera-first HUD.
- [x] Keep the complete generated model available while defaulting the AR view to the exterior for legibility and performance.
- [x] Pass syntax, AR contract, external-fidelity, responsive-layout contract, and localhost checks; document the remaining physical-device WebXR QA boundary.

**Files**
- app.html
- ar.html
- scripts/check_ar_fidelity.mjs
- codex/TASKS.md

**Automated QA**
1. Run `node scripts/check_ar_fidelity.mjs`.
2. Run `node scripts/check_external_fidelity.mjs`.
3. Run JavaScript module syntax checks and `php -l app.html ar.html`.
4. Open a staged AR payload at desktop and mobile widths; confirm the model renders and no console errors occur.

**Verification note**
- Automated contracts, geometry scenarios, syntax checks, and localhost routes pass. Managed macOS browser processes abort before launch in this environment, so camera/WebXR visual and console verification remains an on-device deployment check.
5. Confirm `http://localhost:8000/app.html` and `http://localhost:8000/ar.html` return HTTP 200.

---

## BG-068 - Rebuild the floor-plan view overlay
Status: Done
**Acceptance**
- [x] Generate one representative tower floor per selected building rather than stacking source fragments and podium plans.
- [x] Automatically include a coordinated stair, elevator bank, service core, lobby, corridors, rooms, and floor perimeter.
- [x] Prevent elevator shafts from overlapping stairs or each other.
- [x] Remove the complete service-core envelope before allocating occupiable rooms.
- [x] Prevent rooms from overlapping other rooms, corridors, or the service core.
- [x] Dissolve duplicate wall and corridor geometry into readable systems.
- [x] Derive commercial, residential, mixed-use, and industrial programs from building intent.
- [x] Show the representative floor, program, area, stair-core count, and lift count in the overlay.
- [x] Add a compact plan-system legend so rooms, circulation, core, stairs, and lifts are immediately distinguishable.
- [x] Re-render the overlay when floor-plan or circulation controls change.
- [x] Add executable spatial-overlap and circulation regression tests.

**Files**
- app.html
- scripts/check_external_fidelity.mjs
- codex/TASKS.md

**Automated QA**
1. Run `node scripts/check_external_fidelity.mjs`.
2. Run the JavaScript module syntax check and `php -l app.html`.
3. Confirm `http://localhost:8000/app.html` returns HTTP 200.

---

## BG-069 - Correct exterior defaults and parcel refresh behavior
Status: Done
**Acceptance**
- [x] Start the editor and non-randomized building archetypes with facade articulation disabled.
- [x] Start the editor and non-randomized building archetypes with slab-edge facade bands.
- [x] Rebuild the active building when the user clicks its parcel or visible extrusion after the Mapbox source feature has been hidden.
- [x] Preserve normal selection behavior for clicks outside the active footprint.
- [x] Restore a visible balcony depth when a non-empty balcony type is selected with zero depth.
- [x] Re-render balcony geometry when its primary controls change.
- [x] Add regression assertions for defaults, active-footprint hit testing, and balcony state repair.

**Files**
- app.html
- scripts/check_external_fidelity.mjs
- codex/TASKS.md

**Automated QA**
1. Run `node scripts/check_external_fidelity.mjs`.
2. Run the JavaScript module syntax check and `php -l app.html`.
3. Confirm `http://localhost:8000/app.html` returns HTTP 200.

---

## BG-070 - Replace curated presets with 20 advanced architectural candidates
Status: Done
**Acceptance**
- [x] Replace the eight legacy curated entries with exactly 20 unique schema-v1 review candidates.
- [x] Exclude Solar-Fin Office Tower, Wintergarden Residential Tower, and Green Crown Mixed-Use Landmark.
- [x] Give the collection distinct setback, bundled, tapered, faceted, diagrid, buttressed, terraced, masonry, and framed architectural identities.
- [x] Populate every supported preset field and include a concise architectural description for every candidate.
- [x] Preserve authored material transparency with custom opacity while keeping facade and glazing values within deliberate ranges.
- [x] Make podiums, facade bands, material systems, and roof assemblies visible throughout the collection.
- [x] Use coordinated articulation on exactly 15 candidates and program-appropriate balconies without competing dense systems.
- [x] Keep facade, balcony, and podium projections within conservative buildable limits.
- [x] Configure coherent circulation and floor-plan parameters while keeping internal display systems disabled in exterior view.
- [x] Validate all 20 candidates on rectangular, elongated, and concave footprints with finite geometry and their authored exterior systems intact.
- [x] Generate a 20-candidate axonometric review gallery from the same geometry path used by the application.

**Files**
- presets/defaults.json
- scripts/build_advanced_presets.mjs
- scripts/check_external_fidelity.mjs
- codex/TASKS.md

**Automated QA**
1. Run `node scripts/build_advanced_presets.mjs` and confirm it writes exactly 20 candidates.
2. Run `node scripts/check_external_fidelity.mjs`; confirm 60 candidate footprint scenarios and the six baseline geometry scenarios pass.
3. Run `node scripts/check_external_fidelity.mjs --render-dir output/advanced-presets-20-final` and inspect the candidate contact sheet.
4. Run the JavaScript module syntax check, `php -l app.html`, and `node scripts/lint_tokens_only.mjs`.
5. Confirm `http://localhost:8000/app.html` and `http://localhost:8000/presets/defaults.json` return HTTP 200.

---

## BG-071 - Remove the misleading Building Type editor option
Status: Done
**Acceptance**
- [x] Remove the visible Building Type selector from the main editor.
- [x] Rename Building Intent & Massing to Massing.
- [x] Preserve typology as hidden preset metadata for randomization, floor-plan programming, and GeoJSON export.
- [x] Rename Random Building Type to Design Profile so the randomizer describes its actual role.
- [x] Add regression assertions that the visible selector and terminology do not return.

**Files**
- app.html
- scripts/check_external_fidelity.mjs
- codex/TASKS.md

**Automated QA**
1. Run `node scripts/check_external_fidelity.mjs`.
2. Run the JavaScript module syntax check and `php -l app.html`.
3. Confirm `http://localhost:8000/app.html` returns HTTP 200.

---

## BG-072 - Rebuild podiums as layered street-level entrance systems
Status: Done
**Acceptance**
- [x] Replace the generic podium controls with six coordinated architectural compositions.
- [x] Generate separate plinth, floor plate, spandrel, storefront glass, frame, door, canopy, lobby, and podium-cap layers.
- [x] Provide automatic, longest-edge, cardinal, and near-corner entrance placement.
- [x] Provide recessed, framed, colonnaded, and sculpted entrance compositions.
- [x] Provide clear double doors, revolving vestibules, and retail door-pair systems with explicit trim.
- [x] Make upper podium floor height, plinth height, storefront bay rhythm, pier width, entrance dimensions, lobby depth, canopy projection, and cap depth independently configurable.
- [x] Remove probabilistic podium glazing and keep output deterministic for a given footprint and configuration.
- [x] Preserve older presets through inferred podium-composition defaults.
- [x] Wire all podium layers through Mapbox rendering, transparency modes, styled GeoJSON export, and 3D/AR export layer selection.
- [x] Upgrade all 20 architectural preset candidates with intentional podium and entrance configurations.
- [x] Preserve complete podium systems on rectangular, elongated, concave, and rounded footprints with finite positive geometry.
- [x] Record the 17 precedent pages and the translated architectural rules in `codex/PODIUM_REFERENCE_REVIEW.md`.

**Files**
- app.html
- presets/defaults.json
- scripts/build_advanced_presets.mjs
- scripts/check_external_fidelity.mjs
- codex/PODIUM_REFERENCE_REVIEW.md
- codex/TASKS.md

**Automated QA**
1. Run `node scripts/build_advanced_presets.mjs` and confirm it writes exactly 20 candidates.
2. Run `node scripts/check_external_fidelity.mjs`; confirm all podium-control, geometry, preset-footprint, rendering, and export assertions pass.
3. Run `node scripts/check_external_fidelity.mjs --render-dir output/podium-redesign` and inspect the generated gallery.
4. Run the JavaScript module syntax check, `php -l app.html`, and `node scripts/lint_tokens_only.mjs`.
5. Confirm `http://localhost:8000/app.html` and `http://localhost:8000/presets/defaults.json` return HTTP 200.

---

## BG-073 - Restore podium layers rejected by Mapbox opacity validation
Status: Done
**Acceptance**
- [x] Remove feature-data expressions from `fill-extrusion-opacity`, which Mapbox GL JS does not support.
- [x] Preserve facade, window, podium, and transparency-mode opacity through supported layer-level constants.
- [x] Preserve feature-specific opacity metadata in styled GeoJSON export.
- [x] Restore Mapbox layer creation for podium storefront glass, frames, doors, canopies, lobby, cap, and windows.
- [x] Add a regression assertion that unsupported opacity expressions cannot return.

**Files**
- app.html
- scripts/check_external_fidelity.mjs
- codex/TASKS.md

**Automated QA**
1. Run `node scripts/check_external_fidelity.mjs`.
2. Run the JavaScript module syntax check and `php -l app.html`.
3. Confirm `http://localhost:8000/app.html` returns HTTP 200.

---

## BG-077 - Restore AR and 3D export entry points
Status: Done
**Acceptance**
- [x] Restore the upgraded web AR viewer in the Exports panel.
- [x] Restore AR view in the top view menu and route it to `ar.html`.
- [x] Restore the GLB, USDZ, GLTF, OBJ, and STL format selector and 3D export action.
- [x] Restore bulk GLB alongside bulk GeoJSON.
- [x] Keep native AR beta and account actions outside the primary flow.
- [x] Add regression assertions that the visible AR and 3D controls cannot be hidden again accidentally.

**Files**
- app.html
- scripts/check_ar_fidelity.mjs
- codex/TASKS.md

**Automated QA**
1. Run `node scripts/check_ar_fidelity.mjs`.
2. Run `node scripts/check_external_fidelity.mjs`.
3. Run the JavaScript module syntax check and `php -l app.html`.
4. Confirm `http://localhost:8000/app.html` returns HTTP 200.

---

## BG-078 - Stabilize parcel-locked AR and calm lighting
Status: Done
**Acceptance**
- [x] Make parcel lock a one-way re-lock action instead of a toggle that can accidentally re-enable live drift.
- [x] Capture both the settled GPS reference and current camera pose when re-locking.
- [x] Prioritize absolute orientation events and suppress the competing fallback stream.
- [x] Reject stationary compass jumps, ignore sub-degree jitter, and rate-limit accepted pose changes.
- [x] Use device rotation rate to distinguish deliberate camera movement from compass correction where motion data is available.
- [x] Reduce tone-mapping exposure, direct/fill/environment intensity, and glass clearcoat glare.
- [x] Retain warm solar and camera-matched color while capping runtime WebXR estimated lights.
- [x] Add regression assertions for stabilization and lighting limits.

**Files**
- ar.html
- scripts/check_ar_fidelity.mjs
- codex/TASKS.md

**Automated QA**
1. Run `node scripts/check_ar_fidelity.mjs`.
2. Run the JavaScript module syntax check and `php -l ar.html`.
3. Run `node scripts/check_external_fidelity.mjs` to verify the AR payload and building geometry contract.
4. Confirm `http://localhost:8000/ar.html` returns HTTP 200.

---

## BG-079 - Remove low-value controls (climate multipliers, central core, massing profile, native AR beta)
Status: Done
**Acceptance**
- [x] Remove the four N/E/S/W climate multiplier inputs, their `cfg()` fields and preset mappings; facade climate presets still apply.
- [x] Remove the Central Core controls, geometry, layer and export entries; the floorplan overlay keeps its stair nudge via an internal flag.
- [x] Remove the hard-coded massing profile branch from the envelope scale series and export metadata.
- [x] Remove the "Open Native AR Beta" button and its service-worker / cache staging code (Open AR Viewer and USDZ export remain).
- [x] Interior pillars are kept.
- [x] Old preset JSON that still carries removed keys imports without errors (unknown keys are ignored).

**Files**
- app.html
- scripts/build_advanced_presets.mjs, presets/defaults.json
- scripts/check_ar_fidelity.mjs, scripts/check_external_fidelity.mjs
- codex/TASKS.md

**Follow-ups**
- `native-ar.html` and `sw-ar-assets.js` are no longer linked from the app and can be deleted.

---

## BG-080 - Geometry correctness, facade beauty and five showcase presets
Status: Done
**Acceptance**
- [x] Footprint simplification tolerance is in degrees (was 0.1° ≈ 11 km, collapsing detailed footprints to 4-sided shapes).
- [x] Footprint repair only unkinks self-intersecting outlines and keeps courtyards (holes were being discarded).
- [x] Overall Roundness rounds convex and concave corners (was a no-op on convex plates); rounding is done once on the base plate.
- [x] Taper scales about the area centroid, and every floor is an exact planar scaling of one base plate.
- [x] Facade guide covers every polygon part and courtyard ring, derives outward normals from ring winding, and simplifies rings cyclically in metres.
- [x] Primary axis comes from the minimum-area bounding rectangle instead of the longest edge.
- [x] Local planar frame replaces per-vertex geodesic calls in plan helpers (offsets, rectangles, extents).
- [x] Ribbon glazing: opaque spandrels, recessed vision glass, sill/head frames, measured mullion rhythm per 6 m bay, real transoms (previously mullions cut through the floor plate).
- [x] Interior pillars stack on a structural grid aligned to the building axes, kept clear of the facade.
- [x] Rainscreen panels follow each tapered floor, clad spandrels only, close on full modules; joints run full height.
- [x] Service core and stairwell anchor on the plate's most interior point; stair sizing uses metres (was degrees).
- [x] Roofline: two-tier cornice, parapet coping, uniform-setback terraces/penthouse/plant screen, cooling cells, drummed spire with mast; courtyards stay open on the roof.
- [x] Glass balustrades with base shoe and handrail replace solid railing bands.
- [x] GeoJSON sources use tolerance 0 (default tile simplification silently dropped lattice members and fine trim).
- [x] Per-plate plan memo with rescaled reuse: 25-preset build benchmark 27.8 s → 2.0 s.
- [x] 3D export merges meshes per material and welds vertices (27 nodes instead of ~8,000; smaller GLB).
- [x] Five new presets: Fluted Crystal Spire, Terraced Garden Residences, Limestone Mansion Block, Bronze Rainscreen Exchange, Terracotta Fin Terraces.

**Files**
- app.html
- scripts/build_advanced_presets.mjs, presets/defaults.json
- scripts/check_external_fidelity.mjs
- codex/TASKS.md

**Automated QA**
1. Run `node scripts/build_advanced_presets.mjs` and confirm 25 presets are written.
2. Run `node scripts/check_external_fidelity.mjs` (25 presets) and `node scripts/check_ar_fidelity.mjs`.

**Manual QA**
1. Click a building, apply each new preset, and orbit: glazing reads as recessed glass with mullions; no console errors.
2. Upload a GeoJSON footprint with a courtyard: the courtyard stays open through the tower and roof.
3. Enable Interior Pillars with X-Ray transparency: columns align to the building axis and stack floor to floor.
4. Floorplan view on an L-shaped building shows a full service core with lifts.
5. Download GeoJSON and Export 3D (GLB) still work.

---

## BG-081 - Finch-style unit floorplan engine
Status: Done
**Acceptance**
- [x] Study Finch 3D floor plates, unit plans, evaluation and graphic language (`codex/FINCH3D_FLOORPLAN_STUDY.md`).
- [x] Facade-parallel corridor ring + core lobby + links, sized from the plate's inscribed radius; works on rectangular, L, triangular, courtyard, jagged and curved plates.
- [x] Unit fill along the facade: cuts at concave corners, corner units wrapping convex corners, mix-weighted widths stretched to fit, min frontage 5 m; every unit has a corridor entrance (inaccessible units merge).
- [x] Adaptive studio / 1BR / 2BR / 3BR / hotel-key templates with three-band zoning, mirroring, corridor-side re-mapping and residual handling.
- [x] Doors with swings, entrance markers, windows, dashed open-plan separators, unioned hairline walls (350 / 300 / 120 mm), furniture with door clearance.
- [x] Office floors: workspace neighbourhoods with desk benches, collaboration corners, meeting / focus / pantry suite at the core.
- [x] Room/door graph toggle, rule checks (area, width, daylight, entry) with red flags, 8 scored candidates, KPI card with parallel-axis chart.
- [x] Unit Mix, Show Furniture and Show Room Graph controls; plan view rotated orthogonal to the plate axis.
- [x] Warehouse / data-centre programmes keep the previous grid generator.

**Files**
- app.html
- scripts/check_external_fidelity.mjs
- codex/FINCH3D_FLOORPLAN_STUDY.md, codex/TASKS.md

**Automated QA**
1. `node scripts/check_external_fidelity.mjs` (new unit-plan checks on rectangular + concave plates and an office plate).

**Manual QA**
1. Click a residential building, open View → Floorplan: units, doors, furniture and the evaluation card appear; no console errors.
2. Change Unit Mix and toggle Show Room Graph / Show Furniture: the plan regenerates.
3. Try an office preset and a courtyard GeoJSON footprint.

---

## BG-082 - AR viewer: gyro-locked stability, warm lighting, occlusion, current model
Status: Done
**Acceptance**
- [x] Heading is estimated once from ~1.4 s of compass samples (median/outlier-rejected), then locked to the gyroscope; compass noise and 10–20° jumps no longer move the building. Lock button always visible; Rotate trim for fine alignment.
- [x] Per-frame adaptive pose filter + video-latency compensation; rendered FOV derived from the cover-cropped camera stream (lens trim available).
- [x] Walk-follow: GPS jitter inside ~2× accuracy never moves the model; a real walk glides the anchor.
- [x] Viewer level (balcony / deck / roof) so elevated viewpoints no longer float or sink the model.
- [x] Lighting: neutral tone mapping, capped exposure, sun colour temperature from solar elevation, camera-tinted sky environment for reflections, calm fill; `?sunTime=` preview.
- [x] Materials: opaque exterior, reflective architectural glass, procedural colour + normal maps at metric scale, ground-contact occlusion.
- [x] Occlusion: mapped buildings rebuilt around the locked viewer (own building excluded), sight-line vector tiles fetched, terrain-adjusted bases.
- [x] Current app model: all podium/facade/roof layers plus the unit floorplan interior instanced on every floor ("Exterior + interior").
- [x] Screen wake lock, visibility re-acquire.

**Files**
- ar.html
- app.html (AR interior payload)
- scripts/check_ar_fidelity.mjs
- codex/TASKS.md

---

## BG-083 - Storey-scale setback tiers and a pier crown
Status: Done
**Problem**
The stepped taper scaled the whole plate about its centre every N floors, so every face moved in by a few tens of centimetres and the silhouette read as jitter. The Terraced Crown stacked three 0.35-1.2 m rings on the roof slab, which read as rooftop ornament. NYC towers set back in storey-scale tiers (1.5-4.5 m, 3-6 m at the street wall) in the top 15-30 % of the height, and carry their piers up past the roof to screen the plant.
**Acceptance**
- [x] Massing has three setback tiers, each with a start floor, a setback depth in metres and the faces it applies to (all / street / street + rear / sides). Unselected faces stay on their line.
- [x] Each step is paved, gets a planter band and a 1.1 m glass balustrade (shoe, glass, handrail). "Planted Terraces + Glass Rail" turns the planting and rails off.
- [x] Terraced Crown resolves to three storey-scale tiers in the top quarter instead of rooftop rings.
- [x] The stepped taper is retired from the editor. Legacy presets with an inward step migrate to explicit tiers on load. Outward steps still scale.
- [x] New roof style "Pier Crown": the bay-grid piers rise 1-3 storeys above the roof slab, crenellated, stepped or as an open picture frame with a top beam, around a set-back mechanical bulkhead that stays below the crown.
- [x] Roof, parapet, penthouse and spire follow the setback top plate.

**Files**
- app.html, ar.html
- scripts/build_advanced_presets.mjs, presets/defaults.json
- scripts/check_external_fidelity.mjs
- codex/TASKS.md

**Automated QA**
1. `node scripts/build_advanced_presets.mjs`, then `node scripts/check_external_fidelity.mjs`.

**Manual QA**
1. Apply "Setback Crown Office Tower": the street face steps back at floor 27, two all-round tiers follow with planters and glass rails, and stepped piers screen the plant.
2. Set Tier 1 to floor 10, 3 m, Street face on any building: only the street face moves.
3. Choose Roof Style "Pier Crown" and switch Crown Style between crenellated, stepped and picture frame.

---

## BG-084 - One bay grid for windows, piers, fins and frame posts
Status: Done
**Problem**
Punched windows used their own spacing and corner margin, fins were a count per facade, and ribbon mullions came from a per-6 m setting. Nothing shared a rhythm, windows could not group, and there were no piers standing proud of the wall. Brick and precast with piers and recessed glass is the most common type in the NYC sample (72 of 104 buildings).
**Acceptance**
- [x] Bay Grid settings: bay width, pier width, pier projection, glass recess, lights per bay, transom height (from the floor), floors per window group (1 or 2), pier colour.
- [x] New window style "Pier & bay": piers proud of the facade, wall cut to recessed glass, jambs, head and sill rails, mullions per light, transom, projecting sills. Two-floor groups share one opening with a recessed spandrel panel at the slab.
- [x] "Align windows, fins & posts to bay grid": punched windows group per bay, ribbon mullions run heavy on pier lines and light between, vertical fins and expressed-frame posts land on pier lines.
- [x] Corners are solid: end piers run past the corner so the two faces close.
- [x] Piers stack into one continuous member per run, and faces untouched by a setback keep the floor-0 pier positions so piers run straight through the tier.
- [x] Masonry facade type defaults to Pier & bay. Masonry and loft design profiles use the bay grid.

**Files**
- app.html
- scripts/build_advanced_presets.mjs, presets/defaults.json
- scripts/check_external_fidelity.mjs
- codex/TASKS.md

**Automated QA**
1. `node scripts/check_external_fidelity.mjs` (bay grid section).

**Manual QA**
1. Apply "Charcoal Masonry Technology Tower" and "Limestone Mansion Block": piers, recessed multi-light glass and transoms read at street level.
2. Change Lights per Bay and Floors per Window Group, then regenerate.
3. Turn on the bay grid with a ribbon facade plus vertical fins: fins and heavy mullions line up.
4. On a real GPU, check that the mullion and transom lines on "Setback Crown Office Tower" render solid, not dashed. The dashes seen in the BG-083 audit were captured with a software renderer.

---

## BG-085 - Material zones, colour-blocked volumes and PBR export
Status: Done
**Problem**
Apart from the podium, each element type had one colour across the whole building, which is the strongest tell of a generated building. In the GLB every material shared roughness 0.68 and metalness 0.05, so glass, brick and bronze exported with the same finish.
**Acceptance**
- [x] Base / shaft / top zones: floor counts plus wall colour, texture and frame colour for the base and top. Crown screen walls, parapets and cornices take the top material.
- [x] Plan volumes (auto, or 2-4): 8-25 m wide bands across the primary axis, each with its own material, joined by recessed connector slots (width, depth and colour set separately) cut into the plate.
- [x] Accent panels for punched and pier-and-bay facades: spandrel panels below windows, or panels beside them, stacked by bay at a chosen share of bays.
- [x] Mapbox layers split by per-feature texture, so every zone keeps its own pattern and colour.
- [x] GLB, USDZ and OBJ export use per-layer PBR profiles: transmissive glass (KHR_materials_transmission / ior), metal frames, and brick, stone, concrete, ceramic and planting finishes chosen from the texture.

**Files**
- app.html, ar.html
- scripts/build_advanced_presets.mjs, presets/defaults.json
- scripts/check_external_fidelity.mjs
- codex/TASKS.md

**Automated QA**
1. `node scripts/check_external_fidelity.mjs` (material zone and export material checks).

**Manual QA**
1. Apply "Arcaded Retail Podium Tower" (colour-blocked volumes) and "Monumental Frame Commercial Tower" (darker base zone).
2. Export GLB and open it in a glTF viewer: glass is transmissive and brick, metal and glass read differently.

---

## BG-086 - AR urban context: visible neighbouring masses, occlusion and street alignment
Status: Done
**Problem**
In the AR viewer the building floated in its assumed position. Mapped buildings existed only as invisible depth occluders, loaded only after a location fix, along a narrow corridor. From a distance the building did not read as part of the city, and nothing in view showed whether it was aligned.
**Acceptance**
- [x] Order on load: the building appears first, then neighbouring buildings fade in as extruded masses around it, in front of and behind it.
- [x] Site-area tiles load immediately, without waiting for location. Once located, a sight-line corridor and the viewer's block are added (up to 36 Mapbox Streets z15 tiles, in priority batches). From 3 km the view shows the district skyline with the building among it.
- [x] Context modes (selector plus a floating chip that cycles them on phones): Massing (solid, default), Ghosted, Outlines (align to street), Occlusion only, Off. The choice is saved.
- [x] Masses share the model's transform, so lining the outlines up with the real buildings (Reposition Model or heading trim) also aligns the model.
- [x] Fidelity: footprints are clipped at tile edges, so pieces abut and tile seams are skipped in outlines. The target parcel's own mapped building is excluded, as is the building the viewer stands in. Terrain-adjusted bases, distance haze, shadows within 240 m of the site, and a budget of 5k / 10k / 14k buildings by quality mode.
- [x] Desktop preview keeps the sight line from the preview camera to the model clear.
- [x] Phones: the panel is capped at 50 % of the screen, metrics sit in a 3 x 2 grid, touch targets are 40 px, and the context chip respects the safe area.

**Files**
- ar.html
- scripts/check_ar_fidelity.mjs
- codex/TASKS.md

**Manual QA**
1. Open AR from the generator on a phone: the building appears, then context masses fade in. The Context metric and chip show the building count and extent.
2. Tap the chip to cycle modes. In Outlines, use Reposition Model until the outlines sit on the real buildings.
3. From about 3 km away: the target reads within the skyline, and nearer masses hide it where they stand in front.
4. Check that 30+ fps holds in Auto quality in a dense downtown. Lower to Performance if it does not.

---

## BG-087 - AR stable lock: gimbal-safe orientation, gated compass, DEM eye height
Status: Done
**Problem**
Pointing the camera up made the building vanish and reappear nearby, and even when locked it slid with small camera movements. Near the upright pose, deviceorientation Euler angles flip, which was read as a sensor reset that re-acquired the compass. GPS altitude bobbed the eye height, and each GPS fix snapped the anchor.
**Acceptance**
- [x] Orientation jumps are measured as quaternion deltas, not Euler angles. A real yaw re-reference (over 20° with no matching gyro rotation) is folded into the north offset, so the world pose holds.
- [x] Compass samples count only below 22 °/s and within ±40° of the horizon.
- [x] Lock freezes heading and position at once. "Re-aim (GPS + compass)" is the explicit full re-acquire.
- [x] Eye height comes from the terrain DEM and is resampled only after the anchor moves more than 12 m. A locked anchor follows only a sustained walk.
- [x] The alignment panel is one card on phones: direction pad, Up/Down/Rotate row, Lens row, and Reset and Done in the header.

**Files**
- ar.html, app.html (search bar), codex/TASKS.md

---

## BG-088 - Session persistence between the map and AR, refresh guard, Back to map
Status: Done
**Problem**
Opening AR and coming back, or reloading by accident, dropped the user back in New York with no building: the camera, the selected parcel, every control and the hidden context buildings were lost. The AR page had no way back to the map.
**Acceptance**
- [x] app.html saves the camera, basemap, every editor and site control, the selected footprint(s), the multi-building groups and the hidden context IDs to localStorage (`mbg.session.v1`, 30-day expiry). It saves on move, change, render, pagehide and before the AR hand-off.
- [x] On load, the map starts at the saved camera and basemap (no fly-in), and the building is regenerated from the saved footprint. A toast reads "Restored your last site", with a "Start fresh" action.
- [x] Refresh guard: reload or close asks first while a building is on screen; in-app links and the AR hand-off do not. Pull-to-refresh is blocked by `overscroll-behavior` (Chrome) and a touchmove guard outside scroll areas (iOS Safari).
- [x] ar.html has a top-left "Map" button. It uses history.back() when arriving from app.html (bfcache), otherwise it loads app.html, which restores the session. The camera stream stops first.
- [x] AR context and terrain tiles persist in Cache Storage (`mbg-ar-tiles-v1`, 14 days), so a return visit builds the surroundings without the network.

**Files**
- app.html, ar.html, codex/TASKS.md

**Manual QA**
1. Generate a building, change floors, pan. Open AR, tap Map: same camera, building and floors.
2. Reload: a confirmation appears; after reloading, the same state returns, with the toast.
3. On iOS, pull down on the top bar: the page does not refresh.

---

## BG-089 - Presentation quality: real sun and shadows, MSAA, material systems
Status: Done
**Problem**
Models read as flat and busy. Two directional lights were passed to setLights, but Mapbox v3 keeps one, so the warm key light was dropped and nothing cast a shadow. Without MSAA, 3-15 cm mullions aliased into broken stubs. Presets and the randomizer shared one saturated baby-blue palette, and evenly spaced transoms drew a grid through every pane.
**Acceptance**
- [x] One ambient sky light plus one directional sun (az 214°, polar 48°) with `cast-shadows`. The fake offset ground-shadow fills are removed.
- [x] Map created with `antialias: true`.
- [x] Primary masses get ambient occlusion (wall 2.2 m, ground 9 m); trim does not. `vertical-gradient` is off, because it striped every floor slice.
- [x] Glazing carries a sky-reflection gradient: darker at street level, lighter toward the top.
- [x] 13 named material systems (cladding + frame finish + glass + roof, low-chroma real finishes), each with matching cladding textures. The randomizer draws a whole system, and the cladding texture follows it.
- [x] All 25 curated presets are remapped by colour role to a system that fits their description; designer-specific accents (oxide spandrels, planting, limestone trim) are kept. Default controls use the silver / low-iron system.
- [x] Ribbon transoms sit at 80 % (a high transom under a clerestory), plus 18 % when there are two, not evenly split.
- [x] Footprint simplification at about 0.25 m removes OSM survey jitter and sub-metre jogs.

**Files**
- app.html, presets/defaults.json, scripts/check_external_fidelity.mjs, codex/TASKS.md

**Automated QA**
1. `node scripts/check_external_fidelity.mjs` and `node scripts/check_ar_fidelity.mjs`.

---

## BG-090 - Real building typologies: traditional detail, pitched roofs, curves, a 25-preset library
Status: Done
**Problem**
Presets and random draws still read as variations of a glass tower. Translucent envelopes (facade opacity 0.56-0.94) let every face show through, so stone looked like glass. The generator had no divided lites, bay windows, doors, pitched roofs, rustication, ornament or curved massing, so a two-storey condo, an Art Deco tower or a Hadid building could not be expressed.
**Acceptance**
- [x] Balanced view is fully opaque. Glass reads by colour (darker than the wall) and by the sky gradient. Manual opacity still exists.
- [x] Storeys: a taller ground storey (towers without a podium) and a raised plinth for stoops.
- [x] Windows: divided lites in 8 patterns (1/1, 2/2, 6/6, casement pair, transom light, prairie, Deco grid), on bay and punched windows and on oriels.
- [x] Masonry: stone lintels and keystones, arched openings on the lowest N floors (10-course round heads), rusticated base courses with joint lines that wrap the piers, alternating corner quoins, and a stone trim colour.
- [x] Oriel bay windows (box or 45° canted) on chosen bays and floors. Front doors with stoops, hoods or porches, placed on the bay grid along the street face.
- [x] Roofs:
  - gable, hip and mansard, built as 0.14 m courses, with eave fascia and a wall-coloured gable-end skin
  - dormers aligned to the facade bays
  - rise capped on deep plans (flat deck behind); steep pitches of 50° and over allowed to rise for tower pyramids
  - chimneys, and a cedar water tower on a steel stand
- [x] Art Deco lantern crown: three chamfered tiers with lantern slots, cornices and corner finials, and a stepped cap. Setback terraces can take a stone balustrade or an iron railing.
- [x] Curves: plan twist and sway (clamped at 1.5° per floor, per research), and flowing slab bands whose projection swells and drifts around the plan from floor to floor.
- [x] Library: 25 direct typologies in 6 categories, grouped in the preset menu:
  - townhouses: Brooklyn condos, gabled stacked towns, Toronto bay-and-gable, garden apartments
  - mid-rise: 5-over-1, Scandinavian brick, mass timber
  - pre-war: UES co-op, Haussmann, mansion block, Chicago School, warehouse loft
  - masonry towers: RAMSA limestone, Deco brick, Gothic terracotta, Toronto brick-carried tower, 130 William, Fitzroy, brutalist
  - sculptural: Hadid bands, twisting tower, curved exoskeleton
  - glass (3 kept)
- [x] Randomizer: four new design profiles (townhouse row, pre-war apartment, Art Deco setback tower, sculptural residences) and four new material systems. A profile's own values win over the reset defaults.
- [x] Older presets and imports reset every new detail to off (migration defaults).

**Files**
- app.html, presets/defaults.json, scripts/build_advanced_presets.mjs, scripts/check_external_fidelity.mjs, codex/TASKS.md

**Automated QA**
1. `node scripts/build_advanced_presets.mjs`, then `node scripts/check_external_fidelity.mjs`. The check now covers:
   - library policy: opaque, typology balance, glass minority, glass darker than wall
   - each typology's signature parts on three footprint shapes
2. `node scripts/check_ar_fidelity.mjs`.

**Manual QA**
1. Presets > Townhouses: "Brooklyn Brick Two-Storey Condos". Zoom to street level: stoops, doors, 2-over-2 sashes, keystones, canted bays.
2. "Limestone Art Deco Tower (RAMSA style)": rusticated arched base, setbacks with stone balustrades, lantern crown.
3. "Fluid Band Residences (Hadid style)" and "Twisting White-Band Tower": the bands swell and the plates twist.
4. Randomize Exterior with Design Profile = Townhouse row, then Art Deco setback tower.

**Follow-ups**
- Export maps window frames (`borders`) to the metal PBR profile, so white-painted wood sashes export as metal. Map light-coloured borders to a painted profile for the Shopify GLB marketplace.
- Gable ridges follow the plan's long axis. Irregular footprints get a hip-like result.

## BG-091 - Ultra-modern, office and residential presets; clean-up pass on roofs, rails and setbacks
Status: Done
**Problem**
The library had no Foster, SOM or Gulf-style buildings, few offices and few contemporary residential types. The generator could not make a true diagrid, a chamfered obelisk, spiral setbacks, plant floors or a sculptural crown. A QA render of all 25 presets found these defects:
- Gable roofs ran one ridge across the whole lot, so L-shaped plans got roof "cliffs", and a 2-storey Toronto house got a 16 m roof.
- Dormers sat on the wall line.
- Iron balconies and terrace rails rendered as solid black bands.
- Single-face setbacks left floating slivers at every floor.
- The lattice looked like noise on curved plans.

**Acceptance**
- [x] Gable roofs on any plan:
  - each wing's short ends stay vertical gable walls and every other edge pitches, so an L plan gets a ridge per wing and valleys where wings meet
  - the rise is capped at 3/4 of the eave height
  - the flat deck behind a capped roof is a pale membrane
  - dormers sit 0.4 m back on the slope
  - gable chimneys stand on the ridge
- [x] Iron rails (terrace edge "Iron railing", now also used for balconies): shoe, bottom rail, handrail and square pickets at 0.42 m, so the rail reads as see-through.
- [x] Single-face setback tiers are cleaned by a morphological opening, which removes slivers under ~0.9 m.
- [x] True diagrid replaces the lattice:
  - two families of members wound around the perimeter in opposite directions, by perimeter fraction, so the diamonds stay continuous and follow tapers
  - 8 slices per storey and node ring beams
- [x] New massing tools:
  - chamfered obelisk taper (One WTC)
  - setback rhythm (every N floors, count, depth, faces, including spiral)
  - louvred mechanical floors every N storeys
  - sail-blade and raked glass crowns
  - floors up to 120
- [x] 12 new presets (37 total, 9 menu categories):
  - Ultra-modern & supertall: 30 St Mary Axe, One WTC, Burj Khalifa, Dubai gold sail, Index Tower
  - Office buildings: Willis, Bloomberg London, Hearst, Lever House, precast office park
  - Contemporary residential: Dubai wraparound balconies, 8 House stepped terraces
- [x] Palette pass: lighter zinc, slate and shingle roofs, red pantile on the Scandinavian block, stone balcony slabs on the Haussmann block.

**Files**
- app.html, presets/defaults.json, scripts/build_advanced_presets.mjs, scripts/check_external_fidelity.mjs, codex/TASKS.md

**Automated QA**
1. `node scripts/build_advanced_presets.mjs`, then `node scripts/check_external_fidelity.mjs`. New coverage:
   - 37 presets and 9 categories, with glass-dominant presets at 40% of the library or fewer
   - gable-end walls; iron pickets in place of rail glass
   - diagrid members and ring beams
   - obelisk top-plate area; spiral tiers on 4 faces
   - louvres, blade crown and raked crown
2. `node scripts/check_ar_fidelity.mjs`.

**Manual QA**
1. "Gabled Stacked Townhouses" and "Toronto Bay-and-Gable Row" on an L-shaped lot: a ridge per wing, brick gable triangles, chimneys on the ridge.
2. "Haussmann Limestone Block": balconies show pickets, not black bands.
3. "Diagrid Cigar Tower", "Chamfered Obelisk Supertall", "Spiral Setback Supertall" and "Gold Sail Tower": the diamonds, the chamfer, the spiral steps and the sail crown.

**Follow-ups**
- Diagrid members at sharp convex corners of non-rounded plans project slightly past the corner.
- Window frames still export with the metal PBR profile in GLB (carried from BG-090).
