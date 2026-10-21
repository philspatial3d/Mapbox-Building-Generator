# Building Generator Review

## Core Opinion

The app is strongest as a parcel-to-exterior-building renderer: select or upload a footprint, choose a believable architectural intent, tune the visible envelope, and export styled GeoJSON. It is not a BIM authoring tool and should stop implying that every internal or structural option is equally real. The main weakness was never a lack of features. It was too many partially overlapping features exposed with equal weight.

## What Works

- Clicked and uploaded footprints both feed the same generation path, which is the right core contract.
- Massing, facade material, window system, facade articulation, bands, balconies, podium, and roof now describe one exterior object instead of unrelated subsystems.
- Punched windows finally read as openings in a solid wall because their proportions, recess surrounds, and projecting sills are explicit. This is the most important improvement for brick and masonry output.
- Balconies are now facade-oriented bays with thin slabs and outer-edge railings. They are materially more credible than symmetric line buffers.
- Mechanical, terraced, green, standard, and tapered roofs produce distinct exportable geometry instead of relying on color changes.
- Styled GeoJSON export is the right output for this product because it preserves the generated building as editable GIS/design data rather than a dead image.
- The curated presets and archetype randomizer now share the same exterior contract. That makes repeatable results possible without reviving hidden internal systems.
- Repeated panels, joints, fins, and structural members are grouped into style-equivalent MultiPolygons. This keeps every visible module while reducing the audited 16-floor panelized office from 4,282 features to 230 and the 14-floor residential example from 2,612 to 259.

## What Does Not Work

- True sloped solids, curved mesh roofs, and physically correct material depth are beyond Mapbox fill extrusions. The output is detailed 2.5D GeoJSON, not a watertight architectural mesh.
- Punched windows now use real plan notches through the window-height wall zone. Lattice X-braces use short staggered extrusions across three-floor bays; they read diagonally at building scale but are not structurally engineered sloped members.
- Material textures are graphic patterns, not calibrated PBR materials. Brick, metal, and concrete communicate intent but will not withstand close photoreal inspection.
- Roof equipment, screens, terraces, and planting are credible diagrammatic assemblies. They are not generated from mechanical clearances, drainage, code, or structural loading.
- The single-file implementation remains too large. It makes configuration, geometry, presentation, and export contracts harder to audit than they need to be.

## What Was Removed From The Main Decision Path

- Separate rib, panel, and exoskeleton menus were replaced by one facade articulation choice.
- Unsupported exoskeleton labels and the automatic-paneling note no longer appear as user promises.
- Internal slabs, pillars, cores, stairs, elevators, and floorplans are opt-in and collapsed by default.
- AR, account saving, bulk GLB, and secondary 3D export remain available in code but do not dominate the exterior workflow.
- Randomization is constrained by building type, compatible facade systems, material palettes, balcony rules, and roof families.

## Output Assessment

For medium-distance Mapbox views, the output now has enough hierarchy to read as an intentional building: wall and opening, primary grid, floor band, balcony or structural accent, podium, and roof termination. Masonry, residential, office, glass landmark, and industrial results are visibly different for architectural reasons rather than only palette changes.

The result is still derivative when every facade is driven by a single repeated module across all elevations. The next quality jump should be elevation zoning: explicit base, middle, top, corner, and entrance treatments derived from the same facade guide. That would add authorship without adding another pile of independent controls.

## Verification Opinion

The external-fidelity check executes the geometry functions from `app.html` against the pinned Turf runtime. It verifies punched openings and sills, all facade articulation modes, balconies and railings, bands, roof assemblies, two random samples for every archetype, transparency behavior, coherent presets, styled GeoJSON metadata, and direct parameter sensitivity for every primary exterior control group. It also guards the hidden legacy path and bounded mobile editor layout. Its optional render mode produces six axonometric views from those exact feature collections; those views were inspected to correct roof-painter ordering in the audit and turn the lattice from a noisy floor-by-floor texture into legible three-floor X-braced bays.

This is strong geometry and composition evidence, but it is not a substitute for Mapbox browser QA. The in-app browser refused the local URL under its security policy, so texture scale, mobile interaction, click selection, and console behavior still require a permitted local browser session before release.
