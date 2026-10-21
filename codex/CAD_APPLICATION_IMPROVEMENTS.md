# CAD-Informed Improvements (Facade + External Shape Only)

Scope lock for this brief:
- Include only facade design and the building's external form/massing.
- Exclude interiors, circulation planning, and floorplan logic.
- Target existing exterior systems in `app.html` (`scale()`, facade layers, roof/cornice/parapet/spire, ribs, exoskeleton, balconies, mullions, materials).

Book basis: *best of DETAIL Fassaden / Facades* (Christian Schittich, ed.)
- Vorarlberg Museum facade relief and controlled-random patterning (pp. 8-12)
- Louvre Lens lightweight envelope + ultra-thin facade-detail discipline (pp. 13-17)
- Adhesive-bonded ventilated facade systems and tolerance/movement logic (pp. 18-21)
- Vitra acrylic "curtain" envelope, seam minimization, and wave families (pp. 22-28)
- Breathing facades and climate-responsive envelope behavior (pp. 29-35)

## 1. Facade Pattern Field Engine (Controlled Randomness, Not Noise)
**Why this matters for design quality**
The book's strongest lesson from Vorarlberg and Vitra is that expressive facades read best when "irregular" outcomes are produced by strict underlying rules. Your current ribs/mullions/balconies are robust, but they still risk repetitive or noisy outcomes at some settings.

**What to add in this app**
- Create a facade pattern field that governs all external facade features (`mullions`, `verticalRibs`, `balconies`, `exoskeleton`) from one seeded distribution.
- Use "bounded randomness" by facade zone so each elevation gets variation without visual chaos.
- Add rule families: `calm`, `textile`, `tectonic`, `ornamental` that remap spacing, depth, and rhythm limits.

**Extraordinary prompt**
```text
Act as a facade computational designer. Implement a Facade Pattern Field engine in app.html that coordinates all exterior facade articulation.

Requirements:
1) Build generateFacadeField(shell, cfg, seed) that outputs per-edge rhythm values (spacing, amplitude, density).
2) Route mullion, rib, balcony, and exoskeleton placement through this field so they share a coherent composition logic.
3) Add style modes: calm, textile, tectonic, ornamental.
4) Ensure deterministic results with identical footprint + cfg + seed.
5) Keep scope strictly external: do not touch stairs, elevators, or floorplans.

Acceptance:
- Visual variety increases without random clutter.
- Adjacent facade systems feel intentionally related.
- Regeneration with same seed is pixel-stable in geometry placement.
```

## 2. External Massing Profile Library (Beyond Basic Taper)
**Why this matters for shape consistency and beauty**
DETAIL's case studies repeatedly show that envelope identity comes from clear volumetric intent (soft curvature, prismatic clarity, controlled crown transitions), not from many unrelated tweaks. Your current `taperMode` and roof controls are a strong base; this extends them into architecturally legible profile families.

**What to add in this app**
- Add massing profile presets that operate only on outer shell generation:
  - `prismatic` (crisp, low-variance)
  - `soft-wave` (SANAA-like low-amplitude curvature)
  - `crowned` (controlled top compression)
  - `podium-tower merge` (single continuous silhouette)
- Constrain roof/parapet/penthouse/spire transitions so top elements never appear disconnected from the main form.
- Add "silhouette continuity score" and use it to clamp extreme parameter combinations.

**Extraordinary prompt**
```text
You are a high-rise envelope form specialist. Add an External Massing Profile Library to app.html and integrate it into scale() and roof generation.

Requirements:
1) Introduce massingProfile with options: prismatic, soft-wave, crowned, podium-tower-merge.
2) Rework scale() so profile math is continuous and avoids abrupt sectional jumps.
3) Add continuity guards for transitions among core shell, crown taper, parapet, penthouse, and spire.
4) Compute silhouette continuity score and auto-clamp invalid/extreme profiles.
5) Keep all changes external-envelope only.

Acceptance:
- Side-view silhouette reads intentional at every floor.
- No roof "hat-on-box" artifacts.
- Existing presets continue to render but gain cleaner massing coherence.
```

## 3. Joint-Aware Facade Panelization (Constructable Surface Logic)
**Why this matters for reliability and realism**
From the Vitra and adhesive-facade chapters: facade beauty depends on seam strategy, movement tolerance, and repeatable module families. A constructability-aware panel layer will make exports and visuals more believable and consistent.

**What to add in this app**
- Add an explicit panelization pass for exterior skins that segments envelope surfaces into module bands.
- Add joint rules with thermal movement allowance and corner behavior.
- Minimize visible seam noise by prioritizing long clean runs and controlled termination near openings/edges.

**Extraordinary prompt**
```text
Act as a facade detailing engineer. Add joint-aware panelization for the outer envelope in app.html.

Requirements:
1) Create panelizeFacadeShell(shell, cfg) that returns panel polygons + joint lines.
2) Support module families with limited width sets and optional inversion/orientation variants.
3) Add movement-aware joint sizing parameter and edge termination rules (corners, parapets, openings).
4) Feed panel metadata into GeoJSON export (panel_id, joint_class, module_family).
5) Apply only to external facade layers.

Acceptance:
- Facades show disciplined panel rhythm instead of arbitrary texture-only appearance.
- Joint layouts remain coherent across taper and rounded modes.
- Export contains constructability metadata for downstream tools.
```

## 4. Climate-Responsive Facade Depth and Porosity
**Why this matters for envelope performance expression**
The "breathing facades" and Louvre discussions emphasize envelope depth, glazing ratio, and shading as integrated design variables. Even in a conceptual generator, orientation-aware exterior rules will improve both realism and visual quality.

**What to add in this app**
- Add orientation-based facade zoning (`N/E/S/W` sectors from building bearing).
- Modulate external-only parameters by zone:
  - window openness (`windowAlpha` + recessed glazing depth)
  - rib/exoskeleton shading depth
  - balcony frequency and depth
  - material reflectance palette shifts
- Add facade strategy presets: `temperate-office`, `hot-solar`, `diffuse-daylight`, `monsoon-wind`.

**Extraordinary prompt**
```text
You are an environmental facade designer. Implement climate-responsive exterior zoning in app.html.

Requirements:
1) Derive orientation sectors from primary building bearing and footprint edges.
2) Add facadeClimateMode presets that modulate only external parameters (glazing/recess depth, shading depth, balcony rhythm, facade opacity/texture intent).
3) Keep outputs deterministic and editable from existing controls.
4) Expose per-sector multipliers in advanced settings.
5) Exclude all interior systems from scope.

Acceptance:
- South/west (or high-gain) elevations visibly receive deeper shading logic.
- North/diffuse elevations retain higher visual openness.
- Resulting envelopes look climate-intentional instead of uniformly treated.
```

## 5. Material-Light Choreography for Facade Readability
**Why this matters for beauty at all scales**
DETAIL repeatedly shows that facade excellence comes from how light reads depth, curvature, and material transitions. Your app can achieve a major visual upgrade by linking external component depth to a calibrated material-light response model.

**What to add in this app**
- Introduce an exterior material-light model that harmonizes:
  - base shell reflectance
  - secondary element contrast (mullions/ribs/exo)
  - crown and roof hierarchy
- Add three calibrated visual modes tied to facade depth perception:
  - `diffuse-soft` (cloudy, low-contrast)
  - `crisp-tectonic` (high line clarity)
  - `luminous-metal` (subtle specular identity)
- Auto-balance color/opacity ranges so micro-elements never overpower the parent mass.

**Extraordinary prompt**
```text
Act as an architectural visualization lead focused on facades. Build an exterior-only material-light choreography system in app.html.

Requirements:
1) Add facadeLightMode presets: diffuse-soft, crisp-tectonic, luminous-metal.
2) Map each generated exterior layer to calibrated luminance/contrast bands so hierarchy remains legible from near and far views.
3) Tie pattern opacity and emissive behavior to geometric depth (deeper elements can carry stronger contrast).
4) Prevent over-saturation and facade noise via automatic contrast budgeting.
5) Keep scope limited to external components and roof/crown elements.

Acceptance:
- Facade hierarchy reads clearly at city scale and close-up.
- External materials feel intentional and coherent across presets.
- No interior layer visual settings are modified.
```

## Mega-Prompt (All Five Items Combined)
```text
You are a senior architectural computation + facade engineering lead working inside this codebase. Implement a unified exterior-envelope upgrade in app.html that combines five initiatives into one coherent system: (1) Facade Pattern Field Engine, (2) External Massing Profile Library, (3) Joint-Aware Facade Panelization, (4) Climate-Responsive Facade Depth/Porosity, and (5) Material-Light Choreography.

Core scope (strict):
- Modify only facade and external shape behavior.
- Include massing silhouette, facade articulation, panel seams/joints, orientation-responsive envelope logic, and exterior visual hierarchy.
- Exclude interior planning systems (stairs, elevators, floorplans, internal circulation logic).

Implementation architecture (single coherent pipeline):
1) Build a deterministic facade field generator:
   - generateFacadeField(shell, cfg, seed) -> per-edge/per-zone rhythm descriptors (spacing, amplitude, density, compositional weights).
   - This field must drive mullions, ribs, balconies, and exoskeleton articulation so all facade systems share one composition grammar.
2) Add massing profile library integrated into scale() and roof/crown generation:
   - massingProfile options: prismatic, soft-wave, crowned, podium-tower-merge.
   - Enforce continuous section logic and add silhouette continuity guards across shell -> crown -> parapet -> penthouse -> spire transitions.
3) Add joint-aware panelization pass for exterior shell layers:
   - panelizeFacadeShell(shell, cfg) -> panel polygons + joint lines + metadata.
   - Support bounded module families, orientation variants, corner termination rules, and movement-aware joint sizing.
   - Emit panel metadata in GeoJSON export (panel_id, joint_class, module_family, orientation).
4) Add orientation-based climate facade zoning:
   - Derive N/E/S/W sectors from primary bearing and edge normals.
   - Add facadeClimateMode presets: temperate-office, hot-solar, diffuse-daylight, monsoon-wind.
   - Modulate external-only controls by sector (glazing openness/recess depth, shading depth via ribs/exo, balcony rhythm/depth, facade opacity/material response).
5) Add material-light choreography for facade readability:
   - facadeLightMode presets: diffuse-soft, crisp-tectonic, luminous-metal.
   - Calibrate luminance/contrast budgets by exterior layer hierarchy (primary mass, secondary articulation, crown/roof accents).
   - Tie emissive/pattern intensity to geometric depth and prevent facade noise via automatic contrast clamping.

System constraints:
- Keep outputs deterministic for identical footprint + cfg + seed.
- Preserve existing controls where possible; extend surgically rather than rewriting broad sections.
- Maintain mobile usability and avoid UI clutter.
- Do not introduce regressions in click generation, upload generation, GeoJSON export, or 3D export.
- Keep compatibility with existing layer keys and style export schema; extend metadata in backward-compatible manner.

Execution sequence:
A) Implement shared data structures and helper functions first (field model, massing profile model, panel model, climate zoning model, light model).
B) Integrate them into geometry generation (build/scale/roof and facade element placement).
C) Integrate into rendering style assignment and export metadata.
D) Add minimal UI controls for new modes and seed handling.
E) Add validation/clamping guards and one-pass diagnostics logs for out-of-range combinations.

Acceptance criteria:
- Facade articulation appears intentionally coordinated across mullions/ribs/balconies/exoskeleton (not noisy/random).
- External silhouette reads coherent across all floors and roof transitions, with no abrupt profile breaks.
- Panel/joint logic is visible, structured, and exportable as constructability metadata.
- Orientation differences are visibly meaningful (solar-facing sides get deeper shading logic; diffuse sides remain more open).
- Material-light hierarchy remains legible at both close-up and city scale.
- No interior systems were modified.
- No new console errors in normal flows.
```
