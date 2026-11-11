# Credits

**Figure model**: "Rigged T-Pose Human Male w 50 Face Blendshapes" by Mike Alger
(https://sketchfab.com/mikealger), from
https://sketchfab.com/3d-models/rigged-t-pose-human-male-w-50-face-blendshapes-cc7e4596bcd145208a6992c757854c07,
licensed under CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/).

Only the body and rig are used as published. Changes:

- `assets/uncounted.glb`: the texture is repainted as a different man in different clothes. The beard is removed, the skin made pale, the temples aged, with veins, fractures at the mouth corners, dark nails, darker eyes and new hair. The jacket is now dark wool, the jeans worn trousers stained at the cuffs, the sneakers old leather shoes. The geometry is unchanged. The repaint script lives outside the app.
- At runtime, in `uncounted.js`:
  - re-posed from the T-pose, scaled to 1.93 m, neck lengthened
  - the face restructured through added morph targets (the published GLB contains no blendshapes)
  - a long coat skirt generated and skinned to the hips

The attribution is also shown in the camera's close sheet.

**Map data** for placement: © OpenStreetMap contributors (ODbL), via OpenMapTiles vector tiles
served by OpenFreeMap (https://openfreemap.org). Used only to find walls and pavements; never displayed.

**Libraries**: three.js 0.160.0 (MIT), @mapbox/vector-tile 2.0.5 (BSD-3-Clause) and pbf 4.0.2
(BSD-3-Clause), all loaded from jsDelivr.
