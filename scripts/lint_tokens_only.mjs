#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const tokensPath = path.join(root, 'agency', 'TOKENS.json');
const baselinePath = path.join(root, 'agency', 'HEX_BASELINE.json');
const targetFiles = ['index.html', 'styleguide.html'];
const hexRe = /#[0-9a-fA-F]{3,8}\b/g;

if (!fs.existsSync(tokensPath)) {
  console.error('Missing agency/TOKENS.json');
  process.exit(1);
}

const tokens = JSON.parse(fs.readFileSync(tokensPath, 'utf8'));
const baseline = fs.existsSync(baselinePath)
  ? new Set(JSON.parse(fs.readFileSync(baselinePath, 'utf8')).map(v => String(v).toLowerCase()))
  : new Set();

function collectHexFromObject(input, bucket = new Set()) {
  if (input == null) return bucket;
  if (typeof input === 'string') {
    const matches = input.match(hexRe) || [];
    matches.forEach(m => bucket.add(m.toLowerCase()));
    return bucket;
  }
  if (Array.isArray(input)) {
    input.forEach(v => collectHexFromObject(v, bucket));
    return bucket;
  }
  if (typeof input === 'object') {
    Object.values(input).forEach(v => collectHexFromObject(v, bucket));
  }
  return bucket;
}

const tokenHex = collectHexFromObject(tokens);
const allowed = new Set([...tokenHex, ...baseline]);
const violations = [];

targetFiles.forEach(rel => {
  const abs = path.join(root, rel);
  if (!fs.existsSync(abs)) return;
  const src = fs.readFileSync(abs, 'utf8');
  const found = src.match(hexRe) || [];
  found.forEach(raw => {
    const hex = raw.toLowerCase();
    if (!allowed.has(hex)) violations.push({ file: rel, hex });
  });
});

if (violations.length) {
  console.error('Token-only color lint failed. Found non-token/non-baseline hex values:');
  const seen = new Set();
  violations.forEach(v => {
    const key = `${v.file}:${v.hex}`;
    if (seen.has(key)) return;
    seen.add(key);
    console.error(`- ${v.file} -> ${v.hex}`);
  });
  process.exit(1);
}

console.log(`Token-only color lint passed. Allowed colors=${allowed.size}`);
