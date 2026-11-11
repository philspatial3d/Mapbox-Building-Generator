# Visual resemblance benchmark

A repeatable comparison between generated buildings and professionally modelled reference buildings, at matched scale and views.

The score is a project-specific visual and architectural resemblance score for the **exterior representation**. It is not a measure of BIM completeness or construction accuracy, nor of fidelity to the real building.

## References

Seven openly licensed BIM models, chosen to cover detached, row, apartment, office, institutional and mid-rise slab types. Each was used unmodified as a reference. Its footprint and storey heights were extracted with IfcOpenShell 0.9.

| Case | Model | Type | Above ground | Licence and attribution |
|---|---|---|---|---|
| duplex | NIBS / buildingSMART *Duplex Apartment* (`Duplex_A_20110907.ifc`, IFC2x3) | Two-storey duplex, flat green roof | 6.6 m, 2 storeys | CC BY 4.0. "BSI (2020) Duplex Apartment Test Files, buildingSMART International", [buildingsmart-community/Community-Sample-Test-Files](https://github.com/buildingsmart-community/Community-Sample-Test-Files) |
| fzkhaus | KIT *AC20-FZK-Haus* (IFC4) | Detached house, gable roof | 6.3 m, 1 storey + attic | "Unrestricted use", with attribution: Institute for Automation and Applied Informatics (IAI) / Karlsruhe Institute of Technology (KIT), [ifcwiki.org](https://www.ifcwiki.org/index.php/KIT_IFC_Examples) |
| institute | KIT *AC20-Institute-Var-2* (IFC4) | Three-storey institute/office, barrel roofs | 12.1 m, 3 storeys + roof storey | As above (KIT) |
| smiley | KIT *AC-20-Smiley-West-10-Bldg* (IFC4) | 75 m terraced row, flat roof | 8.2 m, 3 storeys | As above (KIT) |
| schependomlaan | *Schependomlaan* design model (ROOT bv for Hendriks Bouw en Ontwikkeling, Nijmegen; IFC2x3) | Four-storey brick apartment block, steep roof with dormers | 13.4 m, 4 storeys + roof | CC BY 4.0, "(C) original owners" (LICENSE.MD of the dataset; its README also notes the data owners' permission for scientific and academic use). TU Eindhoven, [buildingsmart-community/Community-Sample-Test-Files](https://github.com/buildingsmart-community/Community-Sample-Test-Files) |
| esplanades | Esplan *Esplanades* example model (Estonia; IFC2x3) | Five-storey apartment slab with balconies | 18.0 m, 5 storeys | CC BY 4.0, "(c) Esplan", [buildingsmart-community/Community-Sample-Test-Files](https://github.com/buildingsmart-community/Community-Sample-Test-Files) |
| clinic | NIBS / buildingSMART *Medical-Dental Clinic* (`Clinic_Architectural.ifc`, IFC2x3) | Two-storey clinic, about 2,300 m² plan | 13.5 m, 2 storeys | CC BY 4.0, as Duplex |

No openly licensed high-rise model with clear terms was found; the one tower in the surveyed sets (Holter Tower, in the web-ifc test models) has no stated terms. The benchmark therefore covers low- and mid-rise buildings only. Tower presets are covered by the geometry, integrity and budget checks, not by this score.

The architectural models of Esplanades and Clinic contain no roof geometry; for them, roof and crown is scored against a flat roof with parapet, which their storeys and drawings indicate.

## Method

1. **Inputs from the reference only.**
   - The footprint is the ground-level outline of walls, curtain walls and columns (Schependomlaan also uses its openings, because its layered walls only close with them). Gaps are closed with mitred joins, and the outline is simplified at 0.25 m.
   - It is placed at the model's `IfcSite` location.
   - Storey count and floor-to-floor height come from `IfcBuildingStorey` elevations.
2. **Generation through the real app**, in Chromium, using the default workflow:
   1. upload the footprint as GeoJSON,
   2. import a preset (a library preset plus the editor refinements listed per case below; every refinement is an existing editor control),
   3. generate,
   4. export GLB, IFC4 and GeoJSON with the real buttons.
3. **Matched comparison.** Reference (IfcOpenShell geometry) and generated GLB are rendered in the same three.js viewer:
   - same origin (footprint centroid) and ground plane (the reference's ground storey),
   - same framing radius and the same four views: two obliques, south and east,
   - same lighting and camera.
4. **Objective companions** (`bench/metrics.py`): above-ground height error, storey count, footprint IoU and roof-form agreement.
5. **Expert review** against the rubric below, recorded per building and per reviewer.

The harness is [scripts/benchmark/](../scripts/benchmark/README.md) (fetch_refs.sh, extract_ref.py, run_case.py, viewer.html, shoot.py, metrics.py, cases.json). It is kept out of the app's runtime, and its outputs are listed under Evidence.

## Rubric (100 points)

| Criterion | Weight | 90–100 | 75–89 | 60–74 | 40–59 | below 40 |
|---|---|---|---|---|---|---|
| Massing and proportions | 25 | Footprint, height, storeys and silhouette indistinguishable at matched views | Same massing, small proportion differences | Recognisable, visible height or plan differences | Same type, different proportions | Wrong massing |
| Podium and entrances | 20 | Base, ground floor and entrance match in position and scale | Clear base and entrance, minor placement or scale differences | Base reads, entrance misplaced or mis-scaled | Generic base unlike the reference | Missing or wrong |
| Facade composition and detail | 25 | Window rhythm, proportion and density match, and so do articulation and openings | Rhythm and proportion close, detail simplified | Right system (punched, ribbon, bay) but different rhythm or density | Different system | Unrelated |
| Roof and crown | 15 | Form, pitch, eaves and parapets, and rooftop elements match | Form right, details simplified | Form approximated | Wrong form, similar height | Missing or wrong |
| Material coherence and visual finish | 15 | Colours and materials match, finish clean at normal distance | Close colours, coherent, minor artefacts | Coherent but different palette, or noticeable artefacts | Incoherent or conspicuous artefacts | Broken |

Each criterion's score is out of 100 and weighted. A building's total is the weighted sum.

**Target:**
- average at least 80,
- no building below 70,
- every asset generates and exports successfully,
- source-derived and inferred properties remain distinguishable,
- components have meaningful identities,
- no conspicuous gaps, overlaps or floating elements at normal viewing distance.

## Reviewers

| Reviewer | Role | Status |
|---|---|---|
| R1: Claude (AI, Anthropic) | Generated the benchmark, so not independent | Provisional scores below |
| R2: to be nominated | Architect or BIM professional | Pending |
| R3: to be nominated | Architect or BIM professional | Pending |

The target counts as met only when the human reviewers' scores confirm it. R1's provisional scores are a working estimate, not an expert review.

## Results

Run on 2026-11-02 (benchmark pass 7) against the current `app.html`. Every case generated and exported GLB, IFC4 and GeoJSON through the real buttons, with no page or console errors.

### Inputs and objective metrics

| Case | Library preset | Refinements | Height ref / gen (m) | Error | Footprint IoU | Roof form | Components |
|---|---|---|---|---|---|---|---|
| duplex | Mass Timber Mixed-Use | 27 | 6.63 / 7.12 | +7.4% | 0.992 | flat, green: match | 54 |
| fzkhaus | Garden Apartment Courtyard | 30 | 6.32 / 6.26 | −0.9% | 0.991 | gable: match | 138 |
| institute | Limestone Mansion Block | 24 | 12.05 / 13.11 | +8.8% | 0.993 | barrel vault: match | 212 |
| smiley | Garden Apartment Courtyard | 23 | 8.20 / 8.92 | +8.8% | 0.991 | flat: match | 60 |
| schependomlaan | Scandinavian Brick Courtyard Block | 23 | 13.36 / 14.46 | +8.3% | 0.995 | mansard: match | 147 |
| esplanades | Avenue Mid-Rise Rental (5-over-1) | 22 | 17.97 / 17.84 | −0.7% | 0.994 | flat: match | 230 |
| clinic | Precast Ribbon-Window Office Park | 15 | 13.53 / 14.71 | +8.7% | 0.997 | flat: match | 37 |

- "Refinements" counts the `cases.json` fields that override the preset. All of them are existing editor controls: floors, floor height, colours, window width and spacing, and roof profile and pitch.
- Clinic's reference height is the top of its glazed clerestory. Its main roof is at 9.25 m, and the generated rooftop volume stands in for the clerestory.
- The footprint is the reference's own outline, so the IoU only confirms that upload and placement keep the outline intact (holes, concavities, orientation). It says nothing about plan inference.

### Scores (R1, provisional)

| Case | Massing 25 | Podium 20 | Facade 25 | Roof 15 | Material 15 | **Total** | Main gaps |
|---|---|---|---|---|---|---|---|
| duplex | 85 | 60 | 55 | 85 | 75 | **71** | Regular punched grid where the reference has sparse, varied openings and large glazed panels. No glazed entrance. |
| fzkhaus | 90 | 65 | 65 | 85 | 75 | **76** | Frames dominate the small windows, so they read brown, not glazed. No glazed terrace door, no round gable window. |
| institute | 85 | 60 | 75 | 80 | 75 | **75** | No raised central entrance bay or canopy. The vault is slightly high. |
| smiley | 85 | 55 | 60 | 75 | 70 | **69** | No stair-core entrances or recessed doors along the row. The window rhythm is even where the reference's is grouped. |
| schependomlaan | 75 | 55 | 60 | 60 | 75 | **65** | No twin front gables, bay windows or side annex. The mansard is shallower, and its courses read as ribs. |
| esplanades | 88 | 60 | 70 | 75 | 70 | **73** | Glazing reads too dark. The balconies are smaller and spread more evenly than the reference's. |
| clinic | 75 | 50 | 50 | 65 | 60 | **60** | No curved glazed entrance tower. The windows are sparse dark slots, not small blue groups. The walls are paler than the reference's grey. |
| **Average** | | | | | | **69.9** | |

### Against the target

| Target | Status |
|---|---|
| Average ≥ 80 | **Not met** (69.9, provisional) |
| No building below 70 | **Not met**: smiley 69, schependomlaan 65, clinic 60 |
| Every asset generates and exports | Met: 7 of 7 cases, plus `check_asset_export.mjs` and `check_workflow_browser.py` |
| Source and inferred properties distinguishable | Met: `mbg_basis` and the provenance block in every export ([ASSET_MODEL.md](ASSET_MODEL.md)) |
| Meaningful component identities | Met: stable ids shared by GeoJSON, GLB and IFC |
| No conspicuous gaps, overlaps or floating elements | Met by `check_geometry_integrity.mjs` (62 presets, 3 footprints) and by the sheets above |

Massing and roof form are close, because the inputs come from the reference. The shortfall is podium and facade. The generator applies one regular window grid per zone and an entrance chosen from the street. Real buildings group their openings, mix window types on one face, and mark entrances with bays, gables and canopies. Raising the score needs generator features, not more preset tuning. In priority order:
1. **Grouped and irregular openings** per face: paired windows, blank bays, a large glazed panel on the ground floor.
2. **Entrance features**: projecting bay, canopy, recessed glazed lobby, stair-core doors repeated along long rows.
3. **Front gables and bay windows** on pitched roofs.
4. **Glazing tone in exports**: lighter, less reflective glass for low-rise housing.

These are the next generator tasks. Rescore after each one, and diff every library and famous preset's generated output against the previous `app.html` before accepting it. In this pass, the vault roof, the base-zone fix and the plant-room cap changed no existing preset's height or massing. Only pitched-roof presets differ, and only by finer roof courses (TASKS BG-100).

### Evidence

`codex/evidence/bg-100/benchmark/`:
- `<case>-compare.jpg`: the reference on top and the generated model below, at the same four views;
- `<case>-preset.json`: the exact uploadable preset used;
- `cases.json` and `metrics.json`.

The harness is reproducible from [scripts/benchmark/](../scripts/benchmark/README.md).
