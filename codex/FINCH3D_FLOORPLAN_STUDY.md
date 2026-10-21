# Finch 3D — floorplan study and what we adopted

Scope: how Finch 3D structures floor plates and unit plans, what makes its drawings read well, and how each idea maps onto this app's plan engine (`generateUnitFloorplan` in `app.html`). Sources are Finch's own docs (docs.finch3d.com, incl. the `llms-full.txt` export), their Medium posts, and AEC Magazine coverage. Items marked *(inferred)* come from reading screenshots/GIFs in their docs rather than stated text.

## 1. Workflow

Massing → storey slicing (default storey 3000 mm, outer wall offset 350 mm inward) → programme per storey (Residential / Retail / Office / Circulation, with live GFA / GIA / NIA) → **floor plate generation** → **unit plans** (scan an adaptive plan library, AI-generate in the library's style, or draw with Co-Pilot) → BIM export (Revit model groups, Rhino layers, Grasshopper streams).
Sources: [Massing Studio](https://docs.finch3d.com/courses/finch-101/finch-101-massing-studio.md), [Calculate Data](https://docs.finch3d.com/docs/projects-and-variants/massing-studio/calculate-data.md), [Generating Unit Plans](https://docs.finch3d.com/courses/finch-101/finch-101-generating-unit-plans.md), [Forma extension](https://medium.com/finch3d/launching-the-finch-extension-for-autodesk-forma-connecting-early-stage-design-to-bim-3e5dbe2a4f46).

The split of labour is explicit: hard dimensions (core 1,400 mm, corridor 2 m) are parametric; "soft" spatial composition is graph/AI driven — "Finch doesn't think it's a good idea to go from the elevator into the toilet, into the bedroom" ([AEC Magazine](https://aecmag.com/technology/finch-untethered/)).

## 2. Floor plates — what they do right

1. **Circulation first, as a tagged space.** A `corridor` space is *required*; the algorithm guarantees every apartment has entry access from it (lifts and stairs do not count as access). Corridors come from a centreline offset ±½ width. ([Around Circulation](https://docs.finch3d.com/docs/projects-and-variants/story-editor/generate-unit-mix-around-circulation.md), [Generate Corridor](https://docs.finch3d.com/courses/finch-101/finch-101-generate-corridor.md))
2. **Party walls are "natural connecting lines" from corridor to facade.** Units are the strips between those lines. ([Algorithm Theory](https://docs.finch3d.com/docs/projects-and-variants/story-editor/algorithm-theory.md))
3. **Two-stage solve.** Buckets (one per stair) get a sub-mix first, then units; remaining area is pushed into one unit per bucket. Target areas are hit exactly; infeasible mixes are explained. ([Floor Plate 2.0](https://medium.com/finch3d/transforming-ai-powered-architectural-design-with-finch-enhanced-control-transparency-and-7dbe5dce289b))
4. **Hard constraints, then a transparent weighted score.** Non-negotiables (entry, min unit width ≈ 5 m, stair count) filter; weights (size, mix, squareness, daylight, adjacency, grid) rank. Live KPIs: NIA %, size match, mix %, unique units, iteration count.
5. **Shape support is honest.** Rectilinear and voids ideal, angled supported, courtyards/H/T with workarounds, *curves not supported*. "Align walls with core" can be turned off so cuts follow the local facade normal.

## 3. Unit plans

- **Graph representation.** Rooms *and openings* are nodes; edges run room → door → room, the hallway is the hub; open-plan separators are nodes too. The user never draws the graph — it is derived from the plan. ([Adaptive Plan Library](https://docs.finch3d.com/docs/projects-and-variants/unit-editor/adaptive-plan-library.md), [AEC Magazine 2023](https://aecmag.com/ai/finch3d-starts-to-sing/))
- **Adaptive plans.** A plan has bounds; walls are *locked* or *extendable (min distance)*; stretching yields a match score (Perfect / 99 / 77 / 35 %, default filter ≥ 75 %), with per-room adaptivity and daylight read-outs. Entry walls = walls on `corridor`; facade walls = daylight emitters. Identical units are grouped and auto-mirrored.
- **Zoning *(inferred)*.** Three bands: service band (hall, bath, WC, storage) on the entrance side, bedrooms and living on the facade, kitchen next to living via a dashed separator. Wet rooms cluster by the hall.
- **Rules.** Graph rules check area and passage width (e.g. en-suite > 4 m², accessible double bedroom > 2.75 m) during generation and live during editing; violations show red. ([Graph Rules](https://medium.com/finch3d/introducing-finch-graph-rules-revolutionizing-the-design-process-for-architects-2082d7d127bb))
- **Objects.** Furniture has inner bounds (footprint) and outer bounds (clearance); turning circles sit in front of doors; walls colliding with clearance warn. ([Upload objects](https://docs.finch3d.com/courses/workflows/finch-101-1/upload-objects-from-revit-to-finch.md))
- **Defaults.** Walls: outer 350, party 300, inner 120 mm.

## 4. Why the drawings feel calm

A near-white canvas, one saturated accent (blue) used only for selection and the graph, low-chroma pastels of similar lightness keyed to room type (bed mint, living lavender, kitchen dusty rose, bath powder blue, storage butter, hall grey), hairline double-line walls whose *thickness* carries hierarchy, quarter-arc door swings, a solid triangle for the entrance, dashed open-plan separators, hairline greyscale furniture, and uppercase `NAME / m²` labels only. Colour carries meaning, lines carry geometry, nothing else competes. *(observed in doc frames)*

## 5. What we implemented

| Finch behaviour | Our implementation |
|---|---|
| Corridor as a required tagged space | Corridor = facade-parallel ring (plate offset at facade depth D, width cw) ∪ core lobby ∪ shortest links. Works on any outline — L, triangle, courtyard, **curved** (beyond Finch). |
| Facade depth / dual-aspect awareness | D is the deepest band that still leaves a ≥ cw corridor, targeted from the plate's inscribed radius minus core; residential 5.8–10.5 m, hotel 5.2–8.6 m, office 5.5–13.5 m. |
| Party walls corridor → facade | Facade split into straight runs; each run owns a bisector-bounded strip of the band, so cuts are perpendicular to the *local* facade ("align to core" off). |
| Target mix, exact fill, min width | Units placed by chain position: cuts forced at concave corners, **corner units wrap convex corners** (dual aspect), gaps filled with a mix-weighted sequence stretched to fit (±20 %), min frontage 5 m. Unit type is re-classified from the final area. |
| Hard entry constraint | Units without ≥ 1.2 m of corridor contact are merged into an accessible neighbour; every unit gets an entrance door. |
| Adaptive plans + mirroring | Studio / 1BR / 2BR / 3BR / hotel-key templates in unit-local metres, stretched to frontage, back-zone rooms re-mapped to the corridor-side width (tapering units), alternate units mirrored so wet walls pair, corner units put living at the corner; deep units gain en-suite / dressing. Residual angled pieces extend living (L-shaped) or become an extra daylit bedroom. |
| Three-band zoning | Service band (hall, bath, WC, kitchen, storage) on the corridor side, bedrooms + living on the facade. |
| Room/door graph | Toggle *Show Room Graph*: room nodes, door and entry nodes, open-plan links; Finch blue. |
| Graph rules / compliance | Per-room min area and width, daylight (direct or borrowed through an open-plan room), unit entry; failures outlined red and counted in the card. |
| Weighted score, many candidates | 8 candidates (4 for office) per plate varying seed, mirroring and corner-unit sizing; scored on compliance ×3, NIA ×2, size match ×2, mix ×1.5, daylight ×1.5, adaptivity ×1, dual aspect ×0.5; best is detailed. |
| KPI card + parallel axis | "PLANS GENERATED: N · SCORE", parallel-axis chart (selected in blue), NIA %, units, average unit, unique units, egress travel (≤ 30 m), rule checks, mix chips. |
| Objects with clearances | Beds with pillows and nightstands, wardrobes, sofas, coffee tables, armchairs, dining sets, kitchen runs with sink and hob, kitchenettes, WCs, basins, showers/baths, desk benches, meeting tables, focus desks, pantry tables; every object must sit inside its room and clear door swings. |
| Graphic language | Finch palette, hairline double-line walls (unioned; outer 350 / party 300 / corridor 300 / inner 120 mm), windows as glazing breaks, quarter-arc doors, entrance triangles, dashed separators, uppercase labels (unit labels zoomed out, room labels zoomed in), plan rotated orthogonal to the plate axis. |
| Office floors | Open-workspace neighbourhoods along the facade (open to the circulation ring), collaboration zones at corners, meeting / focus / pantry / print suite around the core. |

Controls: *Advanced Internal / Floorplan* → Unit Mix (Balanced / Compact / Family), Show Furniture, Show Room Graph. Warehouse and data-centre programmes keep the previous grid generator.

## 6. Not yet adopted (next steps)

1. **Stair buckets.** Split long or L plates into several cores with 2–5 units per stair (Nordic point access) instead of one core + ring.
2. **Interactive adaptive library.** Let users save a unit plan as a template with locked/extendable walls and a match score; today templates are built in.
3. **Anytime optimiser in a Web Worker.** Stream candidates continuously with an iteration counter and "Apply plan", rather than a fixed 8.
4. **Structural grid snapping** for party walls (weight "Grid lines").
5. **Accessibility clearances** (turning circles, 1.5 m in front of doors) as outer bounds on objects, with collision warnings.
6. **Plan export** of rooms, doors and furniture to GeoJSON / GLB.
