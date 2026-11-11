#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const basePath = path.join(root, 'agency', 'BASE_PROFILE.json');
const projectPath = path.join(root, 'agency', 'PROJECT_PROFILE.json');
const required = ['grid', 'typography', 'shape_language', 'content_module', 'motion'];

if (!fs.existsSync(basePath) || !fs.existsSync(projectPath)) {
  console.error('Missing agency base/project profile files.');
  process.exit(1);
}

const base = JSON.parse(fs.readFileSync(basePath, 'utf8'));
const current = JSON.parse(fs.readFileSync(projectPath, 'utf8'));

const changed = required.filter(key => base[key] !== current[key]);
if (changed.length < 3) {
  console.error(`Variation lever rule failed. Need >= 3 changed levers; found ${changed.length}.`);
  console.error(`Changed: ${changed.join(', ') || '(none)'}`);
  process.exit(1);
}

console.log(`Variation lever check passed. Changed levers (${changed.length}): ${changed.join(', ')}`);
