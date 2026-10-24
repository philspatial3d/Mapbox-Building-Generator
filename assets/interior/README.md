# Interior asset library

Local derivatives of Poly Haven CC0 models. Source URLs, authors, redistribution rights, bounds, material slots, codec, texture dimensions and triangle counts are recorded in each model manifest and the root manifest.

License source: https://polyhaven.com/license

| Model | Author | High / low triangles |
| --- | --- | --- |
| [GothicBed_01](https://polyhaven.com/a/GothicBed_01) | Kirill Sannikov | 14,057 / 2,232 |
| [dining_chair_02](https://polyhaven.com/a/dining_chair_02) | James Ray Cock | 13,206 / 1,320 |
| [dining_table](https://polyhaven.com/a/dining_table) | Aron Łyczek | 1,048 / 156 |
| [modern_arm_chair_01](https://polyhaven.com/a/modern_arm_chair_01) | Vibrant Nordic | 8,916 / 1,068 |
| [modern_ceiling_lamp_01](https://polyhaven.com/a/modern_ceiling_lamp_01) | James Ray Cock | 5,602 / 684 |
| [modern_coffee_table_01](https://polyhaven.com/a/modern_coffee_table_01) | Amin | 4,504 / 846 |
| [potted_plant_01](https://polyhaven.com/a/potted_plant_01) | Rico Cilliers | 11,401 / 6,433 |
| [sofa_02](https://polyhaven.com/a/sofa_02) | Kirill Sannikov | 2,728 / 327 |

All variants are metres, +Y up, floor-centred, with meshopt geometry and embedded WebP textures at up to 1024 pixels. The runtime never calls the Poly Haven API. Imported texture atlases and source material slots are preserved; this does not yet provide independent upholstery/frame recolouring for every model.

The low bed (2,232 triangles) and plant (6,433) exceed the initial 1,500-triangle target. They remain explicit review gates, not silently approved exceptions. The ornate bed and sofa are strongest in Classic Residential; the full contemporary model set still needs curation.

Review at `/js/interior/review.html`. Eight eye-level screenshots were captured during development. Procedural cabinet runs, desks, task chairs, counters, sanitary fixtures and frames live in `js/interior/furniture.js`; they need further visual refinement before the complete requested set can be called production quality.

Rebuild with Python 3.11+ and the build-only `@gltf-transform/cli@4.3.0` installed:

```sh
python3 scripts/prepare_interior_assets.py
```

No Node build or additional package installation is required to run the app. The viewer imports Three.js add-ons pinned to 0.185.1.
