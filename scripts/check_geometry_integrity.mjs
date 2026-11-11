#!/usr/bin/env node
/* Geometry integrity at normal viewing distances, without a browser.
   For every library preset (and the famous-building set) on three footprints:
   - floating: a component that touches nothing (6 cm tolerance in plan and height);
   - envelope gaps: a vertical gap of more than 10 cm in the facade stack between ground
     and roof, anywhere on the plate;
   - duplicates: two components with identical extents and outline (they z-fight).
   Bounding-box contact is a deliberately coarse test: it finds what a viewer would see as
   detached, not every sliver. Exit code 1 if any preset fails. */
import fs from 'node:fs';
import path from 'node:path';
import { createGenerator } from './lib/headless_generator.mjs';

const root = process.cwd();
const g = await createGenerator(root);
const t = g.turf;
const LNG = 151.2052, LAT = -33.8705;
const KX = 111320 * Math.cos(LAT * Math.PI / 180), KY = 110540;
const m = (x, y) => [LNG + x / KX, LAT + y / KY];
const poly = pts => t.polygon([[...pts, pts[0]].map(([x, y]) => m(x, y))]);
const FOOTPRINTS = {
  rectangle: poly([[-20, -14], [20, -14], [20, 14], [-20, 14]]),
  lshape: poly([[-25, -20], [25, -20], [25, -2], [0, -2], [0, 20], [-25, 20]]),
  wedge: poly([[-20, -25], [20, -25], [0, 30]])
};
const library = JSON.parse(fs.readFileSync(path.join(root, 'presets/defaults.json'), 'utf8')).presets;
const famousDir = path.join(root, 'presets/famous');
const famous = fs.existsSync(famousDir) ? fs.readdirSync(famousDir).sort().map(f => JSON.parse(fs.readFileSync(path.join(famousDir, f), 'utf8'))) : [];
const args = process.argv.slice(2);
const only = args.filter((a, i) => !a.startsWith('--') && args[i - 1] !== '--json');
const presets = [...library, ...famous].filter(p => !only.length || only.some(o => p.name.includes(o)));

const ENVELOPE = new Set(['core', 'windows', 'podium', 'podiumGlass', 'podiumDoors', 'facadePanels', 'piers', 'borders', 'mullions', 'seps']);
const TOL = 0.06;

function boxOf(feature) {
  const p = feature.properties;
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  const walk = a => {
    if (typeof a[0] === 'number') {
      const x = (a[0] - LNG) * KX, y = (a[1] - LAT) * KY;
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
    } else a.forEach(walk);
  };
  walk(feature.geometry.coordinates);
  return { x0, y0, x1, y1, z0: Number(p.b), z1: Number(p.h) };
}

function analyse(geo) {
  const items = [];
  Object.entries(geo).forEach(([layer, fc]) => (fc.features || []).forEach(f => {
    const p = f.properties || {};
    if (!(Number(p.h) > Number(p.b))) return;
    items.push({ layer, part: p.part || layer, box: boxOf(f), key: JSON.stringify(f.geometry.coordinates).length + '|' + Number(p.b).toFixed(3) + '|' + Number(p.h).toFixed(3), f });
  }));
  /* grid buckets on plan, 4 m cells */
  const cell = 4, grid = new Map();
  items.forEach((it, i) => {
    const b = it.box;
    for (let cx = Math.floor((b.x0 - TOL) / cell); cx <= Math.floor((b.x1 + TOL) / cell); cx++)
      for (let cy = Math.floor((b.y0 - TOL) / cell); cy <= Math.floor((b.y1 + TOL) / cell); cy++) {
        const k = cx + ',' + cy;
        if (!grid.has(k)) grid.set(k, []);
        grid.get(k).push(i);
      }
  });
  const touches = (a, b) => a.x0 - TOL <= b.x1 && b.x0 - TOL <= a.x1 && a.y0 - TOL <= b.y1 && b.y0 - TOL <= a.y1 && a.z0 - TOL <= b.z1 && b.z0 - TOL <= a.z1;
  const floating = [];
  items.forEach((it, i) => {
    if (it.box.z0 <= TOL) return; // on the ground
    const b = it.box, seen = new Set();
    let found = false;
    for (let cx = Math.floor((b.x0 - TOL) / cell); cx <= Math.floor((b.x1 + TOL) / cell) && !found; cx++)
      for (let cy = Math.floor((b.y0 - TOL) / cell); cy <= Math.floor((b.y1 + TOL) / cell) && !found; cy++)
        for (const j of grid.get(cx + ',' + cy) || []) {
          if (j === i || seen.has(j)) continue;
          seen.add(j);
          if (touches(b, items[j].box)) { found = true; break; }
        }
    if (!found) floating.push(`${it.layer}/${it.part} at ${b.z0.toFixed(2)}-${b.z1.toFixed(2)} m`);
  });
  /* envelope stack: union of envelope height intervals must cover ground to roof */
  /* up to the main roof slab: crowns, lanterns, mansards and penthouses rise above it by design */
  const roofBase = Math.max(0, ...items.filter(it => it.layer === 'roof' && it.part === 'main_roof_slab').map(it => it.box.z0).concat([0]));
  const intervals = items.filter(it => ENVELOPE.has(it.layer)).map(it => [it.box.z0, it.box.z1]).sort((a, b) => a[0] - b[0]);
  const gaps = [];
  let reach = 0;
  for (const [a, b] of intervals) {
    if (a > reach + 0.1 && reach < roofBase - 0.1) gaps.push(`${reach.toFixed(2)}-${a.toFixed(2)} m`);
    reach = Math.max(reach, b);
  }
  if (reach < roofBase - 0.1) gaps.push(`${reach.toFixed(2)}-${roofBase.toFixed(2)} m (below roof)`);
  /* exact duplicates across layers */
  const dupes = new Map();
  items.forEach(it => {
    const k = it.key + '|' + it.box.x0.toFixed(3) + '|' + it.box.y0.toFixed(3);
    dupes.set(k, (dupes.get(k) || []).concat(`${it.layer}/${it.part}`));
  });
  const duplicates = [...dupes.values()].filter(v => v.length > 1).map(v => v.join(' = '));
  return { components: items.length, floating, gaps, duplicates };
}

let failed = 0;
const summary = [];
for (const preset of presets) {
  const row = { name: preset.name, components: 0, floating: 0, gaps: 0, duplicates: 0, examples: [] };
  for (const [fpName, fp] of Object.entries(FOOTPRINTS)) {
    const r = analyse(g.build(fp, { ...preset.config }));
    row.components += r.components;
    row.floating += r.floating.length;
    row.gaps += r.gaps.length;
    row.duplicates += r.duplicates.length;
    if (r.floating.length) row.examples.push(`${fpName}: floating ${r.floating.slice(0, 2).join('; ')}`);
    if (r.gaps.length) row.examples.push(`${fpName}: envelope gap ${r.gaps.slice(0, 2).join('; ')}`);
    if (r.duplicates.length) row.examples.push(`${fpName}: duplicate ${r.duplicates.slice(0, 1).join('; ')}`);
  }
  const ok = !row.floating && !row.gaps && !row.duplicates;
  if (!ok) failed++;
  summary.push(row);
  console.log(`${ok ? 'PASS' : 'FAIL'} ${preset.name}: ${row.components} components, floating ${row.floating}, envelope gaps ${row.gaps}, duplicates ${row.duplicates}${row.examples.length ? '\n     ' + row.examples.slice(0, 3).join('\n     ') : ''}`);
}
const jsonOut = process.argv.indexOf('--json');
if (jsonOut > 0) fs.writeFileSync(process.argv[jsonOut + 1], JSON.stringify(summary, null, 1));
if (failed) {
  console.error(`${failed} of ${presets.length} presets have integrity findings.`);
  process.exit(1);
}
console.log(`Geometry integrity passed for ${presets.length} presets on ${Object.keys(FOOTPRINTS).length} footprints.`);
