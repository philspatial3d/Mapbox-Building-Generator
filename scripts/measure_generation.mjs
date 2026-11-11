#!/usr/bin/env node
/* Geometry generation time per preset, in Node with the same code app.html runs
   (scripts/lib/headless_generator.mjs). Excludes Mapbox upload and tiling. One warm-up
   build, then the median and maximum of five.
   usage: node scripts/measure_generation.mjs <footprint.geojson> [--all | preset name ...] */
import fs from 'node:fs';
import path from 'node:path';
import { createGenerator } from './lib/headless_generator.mjs';

const root = process.cwd();
const [fpPath, ...wanted] = process.argv.slice(2);
const g = await createGenerator(root);
const fp = JSON.parse(fs.readFileSync(fpPath, 'utf8')).features[0];
const library = JSON.parse(fs.readFileSync(path.join(root, 'presets/defaults.json'), 'utf8')).presets;
const famousDir = path.join(root, 'presets/famous');
if (fs.existsSync(famousDir)) fs.readdirSync(famousDir).sort().forEach(f => library.push(JSON.parse(fs.readFileSync(path.join(famousDir, f), 'utf8'))));
const names = wanted[0] === '--all' ? library.map(p => p.name) : wanted.length ? wanted : [
  'Gabled Stacked Townhouses', 'Avenue Mid-Rise Rental (5-over-1)', 'Haussmann Limestone Block',
  'Limestone Art Deco Tower (RAMSA style)', 'Diagrid on Landmark Base (Hearst style)',
  'Spiral Setback Supertall (Burj Khalifa style)'
];
for (const name of names) {
  const preset = library.find(p => p.name === name);
  if (!preset) { console.log(`skip ${name}: not a library or famous preset`); continue; }
  g.build(fp, { ...preset.config });
  const ms = [];
  for (let i = 0; i < 5; i++) {
    const t = performance.now();
    g.build(fp, { ...preset.config });
    ms.push(performance.now() - t);
  }
  ms.sort((a, b) => a - b);
  console.log(JSON.stringify({ preset: name, generateMsMedian: Math.round(ms[2]), generateMsMax: Math.round(ms[4]) }));
}
