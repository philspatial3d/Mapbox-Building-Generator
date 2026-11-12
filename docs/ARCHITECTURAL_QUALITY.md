# Architectural quality (BG-101)

BG-100 made generated buildings into exportable assets: stable component identities, provenance, IFC4 and integrity checks. BG-101 works on how those buildings look, from the street up to the roof, so that a generated building reads like a designed one at the camera positions people actually use.

The click or upload → preset → refine → export workflow is unchanged. No preset was removed or renamed.

## What changed

### Street level: storefront podiums

- **The podium follows the tower's structure.** Its piers stand under the tower's gridlines: the bay-grid piers, or the 6 m structural bays that a ribbon wall's mullions are set out in. Where the tower has no grid, the piers are set out on even bays along each face (`towerGridLines`, `podiumPierLines`).
- **Corners follow the real plan.** A square, chamfered or rounded corner gets a solid pier that follows it. A rounded or chamfered corner on a glass storefront is glazed round the turn.
- **Depth.** Piers stand 6 to 30 cm proud of the wall. The glass sits in an 18 cm reveal. Spandrels, a storefront transom at door-head height, and frames give the base its layers.
- **The plinth stops at the doorway.** The entrance and lobby sit at pavement level.

### Entrances

- **Podium entrances take whole storefront bays.** The opening spans the run of bays nearest the width asked for, and never less than about a seventh of a long front, up to 12 m (`podiumEntranceSpan`).
- **The entrance is built out.** The door screen has swing doors, or a revolving drum with a swing door on either side, plus pull handles, sidelights, a head rail and a transom light. The recess has a vestibule soffit, and above the portal head there is a glazed overlight rather than a hole. The canopy rests on posts where it is deep and on cantilever brackets otherwise.
- **Lobby.** Behind the screen there is a floor at pavement level, side and back walls, and an indicative reception desk, so the entrance glazing shows something.
- **Lobby portal for buildings without a podium.** A new Entrance Type, `portal`, is available, and the new default, `auto`, picks one by building size:
  - Five storeys or more get a lobby portal: the central bay of the street face (three bays from twelve storeys) opens to the pavement behind pilasters and an entablature, with glazed doors and a bracketed canopy.
  - Lower buildings get a door or a stoop.

  Rustication, sills and spandrel panels stop either side of the portal.
- Presets that had `entryType: "none"` now use `auto`. Three masonry presets moved from `porch`/`door` to `portal`: Upper East Side Pre-War Co-op, Limestone Mansion Block, and Sandstone and Bronze Headquarters (Bloomberg London style).

### Facades

- **Juliet rails.** A new Balcony Type, `juliet`: the bay windows run down to the floor behind a glass guard under a top rail. There is no slab and no projection. Brick-Carried Point Tower (Toronto) uses it in place of slab balconies. It has two parts per face and floor; a third part cost a frame-rate step on phones (see Performance).
- **Ribbon walls.** Mullions are set out in whole structural bays of about 6 m, so the podium below can align with them.
- **Preset refinements.**
  - Limestone Art Deco Tower: cast-stone spandrels a shade below the limestone, so window and spandrel read as one vertical strip between the piers.
  - Brick-Carried Point Tower: the podium base is the same brick as the piers above, with bronze frames and canopy.

### Roofs: the fifth facade

A flat roof is now finished rather than left as a bare slab (`buildRoofscape`):

- a ballasted field inside a perimeter gutter;
- a roof-access core with a door, where there is no plant room or stair bulkhead already;
- a plant yard: fan units on plinths in a louvred screen, with vent stacks beside it;
- rooflights over the deep plan, away from the plant;
- on towers, a facade maintenance unit: a carriage on twin rails, with a mast and jib.

Everything is placed on a 0.8 m lattice in the roof's own frame and clears whatever already stands there, such as a plant room, crown bulkhead, screens or planting. Plant rooms get a louvre band round their upper wall.

Where the tower steps back from the podium, the podium roof becomes a paved terrace behind an upstand. Where the step-back is deep enough to use, it also gets a glass balustrade and a planter strip.

### Exported materials (GLB)

- Every material has one readable, unique name: `<finish>_<layer>_<colour>`, for example `metal_podiumFrames_6c7376`.
- Glass exports as opaque, lightly transmissive PBR, graded by height and by pane through an 8-bit RGBA `COLOR_0`: darker at street level, lighter towards the top. Entrance glazing stays see-through so the lobby shows.
- Materials per building roughly doubled (for example 16 → 33 on the default tower), because frames, lobby and plant now carry their own finishes.

### Source height on first use

On first use, the storey controls are set from the source building's recorded height: the Mapbox `height`, or an uploaded `height` or `building:levels`. "First use" means no preset is chosen, the storey controls haven't been edited and multi-build is off.

The building gets one street-level storey, or two above six storeys, and the rest are tower floors. Picking a preset, editing Floors, Floor Height or Podium Floors, or restoring a session hands control back to the user for good.

The provenance block records the height matched in `heightFollowsSource` (see [ASSET_MODEL.md](ASSET_MODEL.md#source-height)), and the on-page export note says so.

### Identity and IFC

New street-level, portal and roofscape parts each map to an IFC class (`js/asset-model.js`). Examples:

- door pulls and frames → `IfcMember`
- canopy posts and portal pilasters → `IfcColumn`
- rooflights → `IfcWindow` SKYLIGHT
- roof access doors → `IfcDoor`
- roof ballast → `IfcCovering` ROOFING
- Juliet guards → `IfcRailing` GUARDRAIL
- reception desk, rooftop plant and maintenance unit → indicative `IfcBuildingElementProxy`

Every exported element is still contained in a storey and carries `Pset_MBG_Component`.

## How it was checked

Six fixed cases are generated through the real app on an open lot in Docklands, Melbourne, and photographed from matched cameras. Each case gets three Mapbox views (street, oblique, roof) and five views in an independent three.js GLB viewer (street, entrance, facade, oblique, roof). The harness is in [`scripts/quality/`](../scripts/quality/README.md).

| Case | Covers |
|---|---|
| rect-tower-default | Rectangular tower with first-use defaults (no preset) |
| irregular-masonry | Concave plan with a chamfer, skewed edge and hole; Upper East Side Pre-War Co-op |
| residential-tower | Brick-Carried Point Tower (Toronto) |
| office-commercial | Trapezoid plan; Bronze Rainscreen Exchange |
| podium-tower | Setback Crown Office Tower |
| art-deco-tower | Limestone Art Deco Tower (RAMSA style) |

### Before and after

The baseline is the committed `app.html` at `bddd7c1`. Figures are from `codex/evidence/bg-101/summary.json`.

| Case | Height (m) | Components | Triangles (GLB) | Materials | GLB (MB) | GLB export (s) | Entrance |
|---|---|---|---|---|---|---|---|
| rect-tower-default | 70.8 → 71.4 | 343 → 428 | 57,556 → 80,092 | 16 → 33 | 2.8 → 4.0 | 0.21 → 0.32 | yes → yes |
| irregular-masonry | 54.9 → 56.5 | 1149 → 1191 | 273,792 → 278,536 | 19 → 34 | 14.5 → 14.8 | 0.87 → 0.94 | yes → yes |
| residential-tower | 143.9 → 144.9 | 1281 → 1498 | 109,388 → 126,924 | 21 → 33 | 5.6 → 6.7 | 0.38 → 0.49 | yes → yes |
| office-commercial | 146.6 → 148.2 | 1004 → 955 | 160,328 → 164,116 | 23 → 35 | 8.3 → 8.6 | 0.52 → 0.53 | yes → yes |
| podium-tower | 169.6 → 170.6 | 1218 → 1205 | 195,992 → 196,696 | 22 → 35 | 10.2 → 10.4 | 0.61 → 0.63 | yes → yes |
| art-deco-tower | 169.7 → 169.7 | 1353 → 1550 | 191,860 → 208,336 | 15 → 30 | 10.4 → 11.5 | 0.65 → 0.76 | **none → yes** |

- Heights rise by 1 to 1.5 m where the street-level storey is now a full lobby height.
- The Art Deco tower had no entrance at all before. It now has a lobby portal.
- Every case, on desktop and on a 390 px phone, generated and exported with 0 console errors and 0 viewer errors.

### Blind comparison

Three rounds of blind pairwise review compared baseline and after images, with the side randomised per case and per round. The keys and the round-3 image pairs are in `codex/evidence/bg-101/review/`. **The reviewers' verdicts were not saved with the evidence**, so there is no recorded score for this pass. Re-running the review and recording the verdicts is a follow-up.

### Validation and performance

- **IFC4**: IfcOpenShell, all six files valid. There are 0 schema issues, 0 uncontained elements and 0 geometry failures, and the georeference reads back (`ifc-validation.json`).
- **GLB**: Khronos glTF Validator 2.0.0-dev.3.10 reports 0 errors and 0 warnings on all six files (`gltf-validation.json`).
- **Frame rate**: desktop holds 120 fps median for all four measured presets. On an emulated phone (Chromium, 390×844 @3×, CPU throttled 4×, not a real device):
  - Brick-Carried Point Tower first dropped from 57 to 31 fps with a three-part Juliet rail. Cutting it to two parts brought it back to 57 fps (`performance/after-residential.json`).
  - The other presets stay within ±1 fps of baseline (about 40 fps).
- **Generation time**: all 62 presets, recorded in `performance/generation-all.jsonl`.
- **Budgets**: `scripts/budgets.json` was re-recorded for the new street-level and roof parts. The previous budgets are kept in `performance/budgets-before.json`.

## Known limits

- **Ribbon-glazed towers without a podium still have no entrance.** They have no bay grid for a portal to take.
- **The reception desk, rooftop plant and maintenance unit are indicative**, and are labelled as such in IFC.
- **Turf errors are caught on Spiral Setback Supertall.** On the L-shaped integrity footprint, its terrace rail band now logs two caught turf errors, up from one. This is the same known setback-terrace failure listed in BG-100. The building still generates, and the integrity checks pass.
