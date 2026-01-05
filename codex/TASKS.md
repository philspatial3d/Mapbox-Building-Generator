# Codex Backlog — Building Generator

## BG-001 — Mobile controls drawer (hide on mobile, easy access)
Status: Done
**Problem**
Controls panel crowds the viewport on mobile.

**Acceptance**
- On width < 900px: controls are hidden by default behind a button.
- Button toggles a drawer/sheet that is scrollable.
- Drawer has a clear close affordance; does not block map interactions when closed.
- No layout regression on desktop.

**Files**
- index.html (CSS + UI wiring)

**Manual QA**
1. Open on mobile width (devtools). Confirm panel hidden.
2. Toggle open/close. Confirm map still pans/zooms when closed.
3. Generate building + download GeoJSON still works.

---

## BG-002 — Building presets (save/load/share)
Status: Done
**Acceptance**
- “Presets” dropdown with 6–10 curated presets (tower types). the presets are strictly based on different levels and parameters applied to the siderbar menu controls. 
-  Presets include 'Art Deco', 'Brutalist', 'Standard office', 'Condominium'
-  Presets must be extremely detailed, contain subtle and correct color patterns
- “Save preset” writes current cfg() to localStorage.
- “Export preset” downloads JSON; “Import preset” loads JSON and sets UI controls.
-  Preset schema versioned (e.g., `"schema": 1`).

**Files**
- index.html (UI)
- new: presets/defaults.json (or presets/*.json)

**Manual QA**
- Apply preset changes geometry and materials.
- Reload page → saved presets persist.
- Export/import round-trip works.

---

## BG-003 — Sidebar polish (collapsibles + keyboard)
**Acceptance**
- Collapsible headers have proper button semantics / ARIA.
- Keyboard navigation works (tab + enter/space toggles).
- “Random” never generates invalid combos (e.g., stepEvery=0, negative sizes).

...
