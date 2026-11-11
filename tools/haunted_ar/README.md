# Tools for haunted_ar

Rebuilds `haunted_ar/assets/uncounted.glb` from Mike Alger's original model (CC BY 4.0), and tests the scheduler. These are not deployed.

Requires Python with numpy, scipy and Pillow. The source GLB path is set in `glbio.py`.

1. `python posmap.py`: position maps (cm) for every texture pixel, written to `posmaps.npz`.
2. `python paint.py`: repaints the face, skin and clothes, and repacks the GLB into `haunted_ar/assets/`.
3. `python masks.py` (optional): UV island masks, for inspecting the texture layout.
4. `node sim.mjs`: runs 200 simulated sessions through `director.js` and prints how often each encounter happens. It also confirms nothing changes while the figure is on screen.
