# Mapbox Building Generator — Codex instructions

## Project constraints
- This is a vanilla Mapbox GL JS + Turf web app (no framework).
- Prefer small, surgical diffs. Avoid “rewrite index.html” style changes unless the task explicitly asks.
- Do not add new dependencies unless required; if added, justify in PR body.
- Keep Mapbox GL JS version pinned as-is unless the task is “upgrade Mapbox”.

## Definition of done (for every task)
- Implements the acceptance criteria in TASKS.md.
- No console errors in normal use (click building → generates; upload GeoJSON → generates; download works).
- Mobile: controls must be usable on a narrow viewport.
- Update TASKS.md checkboxes / status for the task.

## PR hygiene
- One task per PR.
- PR description must include: what changed, how to test, and any follow-ups.
