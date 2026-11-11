/* The generator's geometry pipeline in a Node VM: app.html's top-level functions and
   constants plus the pinned Turf build, for checks and benchmarks that build without a map. */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { extractGeometryRuntime } from '../geometry_runtime.mjs';

const TURF_URL = 'https://cdn.jsdelivr.net/npm/@turf/turf@6/turf.min.js';

export async function createGenerator(root = process.cwd(), htmlPath = path.join(root, 'app.html')) {
  const html = fs.readFileSync(htmlPath, 'utf8');
  const response = await fetch(TURF_URL);
  if (!response.ok) throw new Error(`Could not load pinned Turf: HTTP ${response.status}`);
  const context = vm.createContext({ console });
  vm.runInContext(await response.text(), context, { filename: 'turf.min.js' });
  /* module imports the app's exporters use */
  Object.assign(context, await import('../../js/asset-model.js'));
  vm.runInContext(extractGeometryRuntime(html), context, { filename: 'app-geometry-runtime.js' });
  return context;
}
