# Exports and BIM interoperability

What each export carries, how it was validated, and what it is not.

**Short version:** the generator writes a georeferenced IFC4 exchange model that IfcOpenShell validates with zero schema or rule issues. Every component is a native IFC element in its storey, with a material, a colour and provenance. It is not an editable Revit model. Revit should open it as IFC-category geometry, but this has not been tested in Revit.

## Formats

| Export | Geometry | Identity and data | Georeference | Validated with |
|---|---|---|---|---|
| **IFC4** (`.ifc`) | Extruded polygons (`IfcExtrudedAreaSolid`, holes as voids), one element per component | IFC class and predefined type, storey containment, `IfcMaterial`, surface colour, `Pset_MBG_Component`, `Pset_*Common.IsExternal`, `Pset_MBG_Provenance` on the building | `IfcMapConversion` to the UTM zone (`IfcProjectedCRS` EPSG:326xx/327xx), `IfcSite` RefLatitude/RefLongitude, source footprint as the site's `FootPrint` curve | IfcOpenShell 0.9 (schema and EXPRESS rules, geometry for every element, containment, psets, georeference read-back) |
| **GLB / glTF** | Merged meshes per level, IFC class and material; PBR materials, glass as transmission | Node per level (`extras.mbg_level`, elevation, height); node per class (`extras.mbg_ifc_class`, type, layer, basis, `mbg_component_ids`); root `extras.mbg_asset` with levels, georeference, provenance, assumptions | Origin and axes in `extras.mbg_asset.georeference` (glTF itself has no CRS) | Khronos glTF Validator 2.0.0-dev.3.10: 0 errors, 0 warnings |
| **GeoJSON** (styled) | Footprint polygons with base/top heights | Every feature carries `mbg_id`, `mbg_ifc_class`, `mbg_ifc_type`, `mbg_component`, `mbg_level`, `mbg_basis`; `mbg_export.asset` holds the manifest header | WGS84 longitude/latitude (native) | Round-trip in the app; ids match the IFC and GLB |
| OBJ, STL, USDZ | Meshes only | None (formats cannot carry it) | None | Not part of the BIM path |

Component ids are identical across all three data-carrying exports. `podiumFrames-L000-b108579c` names the same element in the GeoJSON feature, the GLB node's id list and the IFC `Tag` and `ComponentId` property. The IFC GlobalId is a deterministic hash of that id, so re-exporting an unchanged building keeps its GUIDs.

## Coordinates

- **Origin:** the source footprint centroid at ground level.
- **Local frame:** east–north–up metres on the tangent plane, using an equirectangular approximation (under 1 cm error within 1 km).
- **glTF axes:** x east, y up, z south (north is −z).
- **IFC axes:** x east, y north, z up. The map conversion's x-axis is measured by projecting a point 100 m east into UTM, so grid convergence is included. On the test sites the conversion and the site reference agree within 1.4 cm.
- **Elevation:** taken from the Mapbox terrain model when terrain is on. Otherwise it is recorded as `unknown` and the IFC orthogonal height is 0.

## Revit and other BIM tools

| Path | Status |
|---|---|
| Revit: Insert › Link IFC, or File › Open › IFC | **Not tested** (no Revit licence in this environment). Expected: walls, windows, doors, slabs, roofs, columns, beams, railings and members map to their Revit categories as IFC-imported shapes. They are not editable families: openings are not cut, windows are solids, and there are no type objects. |
| Bonsai/BlenderBIM, FreeCAD and other IfcOpenShell-based tools | Validated through IfcOpenShell itself (see below) |
| Web viewers (That Open / web-ifc, xeokit) | Not yet tested |
| Navisworks, Solibri, BIMcollab Zoom | Not tested |

**Remaining interoperability work:**
1. A Revit link test, and recording which categories arrive.
2. Opening voids (`IfcOpeningElement` with `IfcRelVoidsElement`) for windows and doors, so walls arrive cut.
3. Type objects (`IfcWallType`, `IfcWindowType`) shared across repeated components.
4. `IfcSpace` per storey from the floor-plan engine.
5. An IFC 4.3 variant, and a web-ifc parse test.

## Validating an export

```bash
pip install ifcopenshell numpy pytest trimesh
python scripts/validate_ifc.py building.ifc --glb-dir out/   # schema, rules, geometry, georef; writes a GLB for inspection
node scripts/check_asset_export.mjs --out out/                # builds presets headlessly, writes IFC for the validator
```

`check_asset_export.mjs` covers rectangle, courtyard (hole), L-shape, two-part, sliver and wedge footprints.

## What the exports do not claim

- They are not BIM in the sense of an authored model. Every component is procedural, and `Pset_MBG_Component.Basis` says whether its plan came from the source footprint (`footprint-derived`) or from the generator's rules (`procedural`).
- They are not survey data. Heights, storeys, entrances, materials and details are inferred or designed. `Pset_MBG_Provenance` (IFC) and `mbg_asset.provenance` (GLB, GeoJSON) list the source facts separately from the inferred values, and state the assumptions.
- A GLB or glTF file is a mesh, not an editable Revit model.
