# Native Companion Wrappers

This web app now stages a native AR package under `__mbg_ar_assets/<packageKey>.json|.glb|.usdz` and exposes optional companion launch hooks:

- `mbg-arkit://open?manifest=<url>&tracking=persistent&anchor=geospatial`
- `mbg-arcore://open?manifest=<url>&tracking=persistent&anchor=geospatial`

## Manifest contract

The staged manifest includes:

- `site.lng`
- `site.lat`
- `site.footprintRadiusM`
- `modelFileName`
- `usdzFileName`
- `webArPayloadKey`
- `nativeCompanion.capabilities`

The wrapper should fetch the manifest from the given URL and then fetch the paired asset from the same directory:

- Android: `./__mbg_ar_assets/<packageKey>.glb`
- iOS: `./__mbg_ar_assets/<packageKey>.usdz`

## iOS wrapper target

Recommended stack:

- `RealityKit` or `SceneKit`
- `ARGeoTrackingConfiguration` where available
- `ARWorldTrackingConfiguration` fallback when geotracking is unavailable
- saved calibration persisted with `ARWorldMap` or a companion local-site anchor store

Expected behavior:

1. Read manifest.
2. Resolve terrain/site altitude from Apple location + local DEM if needed.
3. Create a geospatial anchor for the parcel centroid or a parcel-edge anchor set.
4. Load the USDZ model.
5. Apply any saved site calibration offsets.
6. Persist calibration so later launches return the model to the same world position.

## Android wrapper target

Recommended stack:

- `Sceneform`/Filament or custom renderer
- ARCore `Geospatial API`
- VPS / Streetscape Geometry when available
- optional Cloud Anchor or persistent local calibration store

Expected behavior:

1. Read manifest.
2. Resolve terrain/site altitude from geospatial APIs.
3. Create an Earth or Terrain anchor for the parcel.
4. Load the GLB model.
5. Apply stored calibration offsets.
6. Persist those offsets for repeat visits.

## Why the companion wrappers exist

Web AR remains valuable for fast iteration, but three features become materially better in native shells:

- true geospatial anchors
- persistent world tracking
- stronger camera pose updates and occlusion integration

The current website now exposes the payloads and deep-link contracts needed to build those wrappers without changing the geometry pipeline again.
