#!/usr/bin/env node
/* Asset model and IFC export contract, without a browser.
   Builds presets on rectangular, holed, multipart and irregular footprints, then checks that
   every component has a stable unique id, an IFC class, a level and a basis; that source and
   inferred provenance stay apart; and that the IFC4 file is written. Pass --out <dir> to keep
   the IFC files (scripts/validate_ifc.py checks them with IfcOpenShell). */
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createGenerator } from './lib/headless_generator.mjs';
import { buildAssetManifest, componentTypeFor } from '../js/asset-model.js';
import { buildIfc } from '../js/ifc-export.js';

const root = process.cwd();
const outIndex = process.argv.indexOf('--out');
const outDir = outIndex > 0 ? process.argv[outIndex + 1] : null;
if (outDir) fs.mkdirSync(outDir, { recursive: true });
const g = await createGenerator(root);
const t = g.turf;

const library = JSON.parse(fs.readFileSync(path.join(root, 'presets/defaults.json'), 'utf8')).presets;
const famousDir = path.join(root, 'presets/famous');
const famous = fs.existsSync(famousDir) ? fs.readdirSync(famousDir).map(f => JSON.parse(fs.readFileSync(path.join(famousDir, f), 'utf8'))) : [];
const preset = name => [...library, ...famous].find(p => p.name === name);

const LNG = 151.2052, LAT = -33.8705;
const m = (x, y) => [LNG + x / (111320 * Math.cos(LAT * Math.PI / 180)), LAT + y / 110540];
const poly = (pts, holes = []) => t.polygon([[...pts, pts[0]].map(([x, y]) => m(x, y)), ...holes.map(h => [...h, h[0]].map(([x, y]) => m(x, y)))]);
const FOOTPRINTS = {
  rectangle: [poly([[-20, -14], [20, -14], [20, 14], [-20, 14]])],
  courtyard: [poly([[-30, -24], [30, -24], [30, 24], [-30, 24]], [[[-12, -8], [12, -8], [12, 8], [-12, 8]].reverse()])],
  lshape: [poly([[-25, -20], [25, -20], [25, -2], [0, -2], [0, 20], [-25, 20]])],
  multipart: [poly([[-30, -10], [-8, -10], [-8, 10], [-30, 10]]), poly([[8, -10], [30, -10], [30, 10], [8, 10]])],
  sliver: [poly([[-30, -4], [30, -4], [30, 4], [-30, 4]])],
  wedge: [poly([[-20, -25], [20, -25], [0, 30]])]
};
const CASES = [
  ['Limestone Art Deco Tower (RAMSA style)', 'rectangle'],
  ['Haussmann Limestone Block', 'courtyard'],
  ['Brutalist Concrete Slab', 'lshape'],
  ['Avenue Mid-Rise Rental (5-over-1)', 'multipart'],
  ['Gabled Stacked Townhouses', 'sliver'],
  ['Diagrid on Landmark Base (Hearst style)', 'rectangle'],
  ['Beaux-Arts Wedge (Flatiron style)', 'wedge']
];

const centroidOf = fps => {
  const c = t.centroid(t.featureCollection(fps));
  return { lng: c.geometry.coordinates[0], lat: c.geometry.coordinates[1] };
};
function generate(presetName, footprintKey) {
  const p = preset(presetName);
  assert.ok(p, `preset ${presetName} exists`);
  const cfg = { ...p.config, presetName };
  const fps = FOOTPRINTS[footprintKey];
  const geo = fps.length === 1 ? g.build(fps[0], cfg) : g.buildMerged(fps, cfg);
  const levels = g.assetLevelsFor(cfg);
  const origin = { ...centroidOf(fps), elevation: null };
  const manifest = buildAssetManifest({ geo, cfg, levels, origin, source: { type: 'upload', footprints: fps, facts: {} } });
  return { cfg, geo, levels, manifest, fps };
}

let failures = 0;
const check = (cond, msg) => { if (cond) console.log(`PASS ${msg}`); else { failures++; console.log(`FAIL ${msg}`); } };

for (const [presetName, fpKey] of CASES) {
  const a = generate(presetName, fpKey);
  const b = generate(presetName, fpKey);
  const ids = a.manifest.components.map(c => c.id);
  const label = `${presetName} on ${fpKey}`;
  check(ids.length > 0, `${label}: ${ids.length} components`);
  check(new Set(ids).size === ids.length, `${label}: component ids are unique`);
  check(ids.join() === b.manifest.components.map(c => c.id).join(), `${label}: ids are stable across rebuilds`);
  check(a.manifest.components.every(c => /^Ifc[A-Z]/.test(c.ifc) && c.predefinedType && c.name), `${label}: every component has an IFC class, type and name`);
  const levelIdx = new Set(a.levels.map(l => l.index));
  check(a.manifest.components.every(c => levelIdx.has(c.level)), `${label}: every component sits on a level`);
  check(a.manifest.components.every(c => ['footprint-derived', 'procedural'].includes(c.basis)), `${label}: every component records its basis`);
  check(a.manifest.components.some(c => c.basis === 'footprint-derived') && a.manifest.components.some(c => c.basis === 'procedural'), `${label}: footprint-derived and procedural parts are both present and distinguished`);
  check(a.levels.every((l, i) => i === 0 || l.elevation >= a.levels[i - 1].elevation), `${label}: levels ascend`);
  const src = a.manifest.provenance.source;
  check(src.footprintCount === a.fps.length && src.footprintAreaM2 > 0, `${label}: source footprint recorded (${src.footprintAreaM2.toFixed(0)} m2, ${src.footprintParts} parts, ${src.footprintHoles} holes)`);
  check(a.manifest.provenance.assumptions.length >= 4, `${label}: procedural assumptions stated`);
  const styles = g.getExportLayerStyles(a.cfg);
  const styleFor = (layerKey, props) => {
    const s = styles[layerKey] || { fillColor: '#999999', fillOpacity: 1 };
    return { color: typeof props.c === 'string' ? props.c : s.fillColor, opacity: s.fillOpacity, material: `${componentTypeFor(layerKey, props.part).name}` };
  };
  const ifc = buildIfc({ manifest: a.manifest, geo: a.geo, styleFor, sourceFootprints: a.fps, name: presetName, timestamp: '2026-11-02T00:00:00Z' });
  check(ifc.stats.elements > 0 && /FILE_SCHEMA\(\('IFC4'\)\)/.test(ifc.text), `${label}: IFC4 written (${ifc.stats.elements} elements, ${(ifc.text.length / 1048576).toFixed(1)} MB)`);
  if (outDir) {
    const slug = `${presetName}-${fpKey}`.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    fs.writeFileSync(path.join(outDir, `${slug}.ifc`), ifc.text);
    fs.writeFileSync(path.join(outDir, `${slug}.manifest.json`), JSON.stringify({ ...a.manifest, components: a.manifest.components.length }, null, 1));
  }
}
if (failures) {
  console.error(`${failures} asset export check(s) failed.`);
  process.exit(1);
}
console.log('Asset model and IFC export checks passed.');
