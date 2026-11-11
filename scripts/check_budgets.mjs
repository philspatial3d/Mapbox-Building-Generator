#!/usr/bin/env node
/* Geometry budgets: every preset's component, vertex and solid counts on two standard
   footprints, against scripts/budgets.json. A preset fails when any count grows more than
   15% past its recorded budget, which is what costs frame time in the map, the AR viewer
   and the exports. Run with --update after a deliberate change, and say why in the PR. */
import fs from 'node:fs';
import path from 'node:path';
import { createGenerator } from './lib/headless_generator.mjs';

const root = process.cwd();
const budgetPath = path.join(root, 'scripts/budgets.json');
const update = process.argv.includes('--update');
const HEADROOM = 1.15;
const g = await createGenerator(root);
const t = g.turf;
const LNG = 151.2052, LAT = -33.8705;
const m = (x, y) => [LNG + x / (111320 * Math.cos(LAT * Math.PI / 180)), LAT + y / 110540];
const poly = pts => t.polygon([[...pts, pts[0]].map(([x, y]) => m(x, y))]);
const FOOTPRINTS = {
  tower: poly([[-20, -14], [20, -14], [20, 14], [-20, 14]]),
  block: poly([[-30, -24], [30, -24], [30, 24], [0, 24], [0, 4], [-30, 4]])
};
const library = JSON.parse(fs.readFileSync(path.join(root, 'presets/defaults.json'), 'utf8')).presets;
const famousDir = path.join(root, 'presets/famous');
const famous = fs.existsSync(famousDir) ? fs.readdirSync(famousDir).sort().map(f => JSON.parse(fs.readFileSync(path.join(famousDir, f), 'utf8'))) : [];

function measure(geo) {
  let components = 0, vertices = 0, solids = 0;
  Object.values(geo).forEach(fc => (fc.features || []).forEach(f => {
    if (!(Number(f.properties.h) > Number(f.properties.b))) return;
    components++;
    const polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
    solids += polys.length;
    polys.forEach(p => p.forEach(r => { vertices += r.length; }));
  }));
  return { components, vertices, solids };
}

const current = {};
for (const preset of [...library, ...famous]) {
  current[preset.name] = {};
  for (const [name, fp] of Object.entries(FOOTPRINTS)) current[preset.name][name] = measure(g.build(fp, { ...preset.config }));
}
if (update || !fs.existsSync(budgetPath)) {
  fs.writeFileSync(budgetPath, JSON.stringify({ headroom: HEADROOM, recorded: new Date().toISOString().slice(0, 10), presets: current }, null, 1) + '\n');
  console.log(`Recorded budgets for ${Object.keys(current).length} presets in scripts/budgets.json.`);
  process.exit(0);
}
const budgets = JSON.parse(fs.readFileSync(budgetPath, 'utf8')).presets;
let failed = 0;
for (const [preset, byFootprint] of Object.entries(current)) {
  const budget = budgets[preset];
  if (!budget) { console.log(`NEW  ${preset}: no budget yet (run with --update)`); continue; }
  for (const [fp, counts] of Object.entries(byFootprint)) {
    for (const key of ['components', 'vertices', 'solids']) {
      const limit = Math.ceil(budget[fp][key] * HEADROOM);
      if (counts[key] > limit) {
        failed++;
        console.log(`FAIL ${preset} on ${fp}: ${key} ${counts[key]} > budget ${budget[fp][key]} (+15% = ${limit})`);
      }
    }
  }
}
if (failed) process.exit(1);
console.log(`Geometry budgets hold for ${Object.keys(current).length} presets on ${Object.keys(FOOTPRINTS).length} footprints.`);
