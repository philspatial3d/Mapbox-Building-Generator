#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const logPath = path.join(root, 'agency', 'CRITIQUE_LOG.md');

if (!fs.existsSync(logPath)) {
  console.error('Missing agency/CRITIQUE_LOG.md');
  process.exit(1);
}

const txt = fs.readFileSync(logPath, 'utf8');
const requiredHeadings = [
  '### Cliches Present',
  '### Most Distinctive Decision',
  '### Inconsistencies With BRAND.md',
  '### 3 Changes To Make It Unmistakable'
];

for (const h of requiredHeadings) {
  if (!txt.includes(h)) {
    console.error(`Creative director log missing section: ${h}`);
    process.exit(1);
  }
}

const placeholderRe = /\b(todo|tbd|placeholder)\b/i;
if (placeholderRe.test(txt)) {
  console.error('Creative director log contains placeholder text.');
  process.exit(1);
}

const changeItems = (txt.match(/^\d+\.\s.+$/gm) || []).length;
if (changeItems < 3) {
  console.error('Creative director log must include at least 3 numbered changes.');
  process.exit(1);
}

console.log('Creative director check passed.');
