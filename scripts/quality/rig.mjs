#!/usr/bin/env node
/* Build one quality case headlessly (no browser, no map) with the settings a capture run
   recorded, and summarise the generated parts. For iterating on the generator.
   usage: node scripts/quality/rig.mjs <captured case.json> [--app path/to/app.html] [--current] [--set key=value,...] [--parts regex] [--layer name] [--dump out.json]
   --current takes the case's library preset as it is now in presets/defaults.json (the recorded
   settings are the ones the capture ran with), keeping the recorded street bearing. */
import fs from 'node:fs';
import path from 'node:path';
import { createGenerator } from '../lib/headless_generator.mjs';

const args = process.argv.slice(2);
const flag = name => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : null; };
const root = process.cwd();
const rec = JSON.parse(fs.readFileSync(args[0], 'utf8'));
const g = await createGenerator(root, flag('--app') || path.join(root, 'app.html'));
const fp = JSON.parse(fs.readFileSync(path.join(root, 'scripts/quality/footprints', rec.footprint), 'utf8')).features[0];
const t0 = performance.now();
let raw = { ...rec.config };
if (args.includes('--current') && rec.preset) {
  const preset = JSON.parse(fs.readFileSync(path.join(root, 'presets/defaults.json'), 'utf8')).presets.find(p => p.name === rec.preset);
  raw = { ...preset.config, __streetBearing: rec.config.__streetBearing, __entranceBasis: rec.config.__entranceBasis };
}
(flag('--set') || '').split(',').filter(Boolean).forEach(pair => {
  const [k, v] = pair.split('=');
  raw[k] = v === 'true' ? true : v === 'false' ? false : (v !== '' && Number.isFinite(Number(v)) ? Number(v) : v);
});
const cfg = g.applyEnvelopeGuards ? g.applyEnvelopeGuards(raw) : raw;
const geo = g.build(fp, cfg);
const ms = performance.now() - t0;
const partsRe = flag('--parts') ? new RegExp(flag('--parts')) : null;
const onlyLayer = flag('--layer');
let total = 0, verts = 0;
const rows = [];
for (const [layer, fc] of Object.entries(geo)) {
  const byPart = new Map();
  for (const f of fc.features) {
    const p = f.properties || {};
    const part = p.part || '(none)';
    const polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
    const v = polys.reduce((s, poly) => s + poly.reduce((a, r) => a + r.length, 0), 0);
    const e = byPart.get(part) || { n: 0, solids: 0, v: 0, b: Infinity, h: -Infinity };
    e.n++; e.solids += polys.length; e.v += v; e.b = Math.min(e.b, p.b); e.h = Math.max(e.h, p.h);
    byPart.set(part, e);
    total++; verts += v;
  }
  for (const [part, e] of byPart) rows.push({ layer, part, ...e });
}
console.log(`${rec.id}: ${total} features, ${verts} ring vertices, ${ms.toFixed(0)} ms`);
for (const r of rows) {
  if (onlyLayer && r.layer !== onlyLayer) continue;
  if (partsRe && !partsRe.test(r.part) && !partsRe.test(r.layer)) continue;
  console.log(`  ${r.layer.padEnd(18)} ${r.part.padEnd(30)} n=${String(r.n).padStart(4)} solids=${String(r.solids).padStart(5)} z=${r.b.toFixed(2)}..${r.h.toFixed(2)}`);
}
if (flag('--dump')) fs.writeFileSync(flag('--dump'), JSON.stringify(geo));
