#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const sprintPath = path.join(root, 'agency', 'CONCEPT_SPRINT.md');
const tokensPath = path.join(root, 'agency', 'TOKENS.json');

if (!fs.existsSync(sprintPath)) {
  console.error('Missing agency/CONCEPT_SPRINT.md');
  process.exit(1);
}
if (!fs.existsSync(tokensPath)) {
  console.error('Missing agency/TOKENS.json');
  process.exit(1);
}

const sprint = fs.readFileSync(sprintPath, 'utf8');
const tokens = JSON.parse(fs.readFileSync(tokensPath, 'utf8'));

const directionCount = (sprint.match(/^## Direction /gm) || []).length;
if (directionCount < 3) {
  console.error(`Concept sprint must include at least 3 directions. Found: ${directionCount}`);
  process.exit(1);
}

const selectedLine = sprint.match(/^\- `(.+)`$/m);
if (!selectedLine) {
  console.error('Concept sprint must declare a selected direction in a backticked bullet.');
  process.exit(1);
}
const selected = selectedLine[1].trim();
const frozen = (((tokens || {}).meta || {}).conceptDirection || '').trim();
if (!frozen) {
  console.error('TOKENS.json missing meta.conceptDirection.');
  process.exit(1);
}
if (selected !== frozen) {
  console.error(`Selected direction mismatch. CONCEPT_SPRINT="${selected}" TOKENS="${frozen}"`);
  process.exit(1);
}

console.log(`Concept sprint check passed. Directions=${directionCount}, selected="${selected}"`);
