# Asset model

How a generated building is described, independent of how it is drawn. The definitions live in [js/asset-model.js](../js/asset-model.js) (pure functions, shared by the app, the exporters and the Node checks).

## Hierarchy

**Site** (source footprint, location) › **Building** › **Levels** (Level 00 … roof) › **Components**

The level table comes from `assetLevelsFor(cfg)` in `app.html`, and it uses the same elevations the geometry is built on:
- podium storeys, using the special ground floor height when it is set,
- then tower storeys, using `towerFloorOffset` and `towerFloorHeight`, which include zoned and mechanical floors,
- then the roof.

A raised plinth belongs to Level 00. Each component belongs to the highest level whose elevation is at or below its base.

## Component record

| Field | Meaning |
|---|---|
| `id` | `<layer>-L<level>-<hash>`. The hash covers the layer, part, level, base, top, outline anchor and ordinal, so the same footprint and settings give the same id on every export. |
| `ifc`, `predefinedType`, `objectType` | IFC4 class and enumeration, for example `IfcWindow WINDOW`, `IfcRailing BALUSTRADE`, `IfcColumn PILASTER`, `IfcRoof GABLE_ROOF`. `USERDEFINED` always comes with an object type. |
| `name` | Plain-language component name, for example "Storefront glazing" or "Parapet coping". |
| `layer`, `part` | The generator's layer and part, which say where the component came from. |
| `level` | Index into the level table. |
| `basis` | `footprint-derived` when the plan is the source footprint or a storey-by-storey offset of it (exterior walls, podium walls, parapets, roof slabs, floor slabs, coping). `procedural` when the generator's rules placed it (windows, frames, entrances, canopies, cornices, equipment, chimneys, fins). |
| `base`, `top`, `height` | Metres above ground. |
| `planAreaM2`, `solids` | Plan area, and the number of polygons extruded. |

The mapping from layers and parts to IFC classes is the `TYPES` and `PART_RULES` table in `asset-model.js`. There are 37 layers and about 40 part rules, for example chimneys become `IfcChimney`, front doors `IfcDoor`, stone lintels `IfcBeam LINTEL` and dormers an `IfcRoof` with object type "Dormer".

## Provenance

`provenance.source` records only what the input actually said:
- the input type (map click, upload or draw),
- the footprint's area, parts and holes,
- for a Mapbox building, its `height` and `min_height` and the feature id,
- for an uploaded GeoJSON, its `height`, `min_height` and `building:levels`.

These source heights are recorded but not imposed on the design.

`provenance.inferred` records what the generator chose:
- storeys and total height, and the preset,
- the entrance side and why: chosen in the editor, facing the nearest mapped street (with its name, class and distance), or the widest suitable facade when no street is mapped within 90 m,
- the roof profile and facade type.

`provenance.assumptions` states the procedural assumptions in words. Every export carries them.

## Entrances

In Auto mode, the entrance faces the nearest mapped street within 90 m, read from the basemap's Mapbox Streets road layer. Major roads are weighted ahead of lanes. The facade chosen is the widest one within 60° of the street; if none qualifies, it's the closest-facing one.

A face only takes the entrance if it can hold the opening plus a pier either side, so the entrance width plus 2 m, and never less than 4 m. When the plan has no face that wide, the narrowest usable face is 2.4 m.

The Entrance Facade control (North, East, South, West, Longest edge, Near corner) overrides all of this.

The entrance takes whole storefront bays. Where the tower above has a structural grid (bay-grid piers, or the 6 m structural bays a ribbon wall's mullions are set out in), the podium piers stand under it, and the entrance spans the run of bays closest to the width asked for, never less than about a seventh of a long front.

A building without a podium takes its entrance from Entrance Type. `Auto` (the default) gives a building of five storeys or more a lobby portal: the central bay of the street face (three bays from twelve storeys) opens to the pavement behind a surround of pilasters and an entablature, with glazed doors and a bracketed canopy. Lower buildings get a door or a stoop. Ribbon-glazed towers without a podium have no bay grid to take a portal and still have no entrance (see TASKS BG-101, follow-up).

## Source height

`provenance.source.sourceHeightM` and `sourceLevels` record what the source said. On first use (no preset chosen, storey controls untouched) the storey controls are set from that height, and `heightFollowsSource` records the height matched. Once a preset is chosen or the storey controls are edited, the design's own storeys apply and `heightFollowsSource` is null. Either way the storeys are a design interpretation, not a survey.
