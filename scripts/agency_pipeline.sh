#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WITH_SNAPSHOTS="${1:-}"

cd "$ROOT"

echo "Running agency checks..."
node scripts/check_concept_sprint.mjs
node scripts/check_variation_levers.mjs
node scripts/lint_tokens_only.mjs
node scripts/check_creative_director.mjs

if [[ "$WITH_SNAPSHOTS" == "--with-snapshots" ]]; then
  bash scripts/visual_regression.sh
fi

echo "Agency pipeline passed."
