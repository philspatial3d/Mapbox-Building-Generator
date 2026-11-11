#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/artifacts/visual"
PORT="${PORT:-4173}"

mkdir -p "$OUT"

cd "$ROOT"
python3 -m http.server "$PORT" >/tmp/spatial_style_http.log 2>&1 &
SERVER_PID=$!
trap 'kill "$SERVER_PID" >/dev/null 2>&1 || true' EXIT
sleep 1

echo "Capturing visual snapshots into $OUT ..."
npx --yes playwright@1.52.0 install chromium >/tmp/spatial_playwright_install.log 2>&1 || true
npx --yes playwright@1.52.0 screenshot --browser=chromium --viewport-size="1440,900" "http://127.0.0.1:$PORT/index.html" "$OUT/index-desktop.png"
npx --yes playwright@1.52.0 screenshot --browser=chromium --viewport-size="390,844" "http://127.0.0.1:$PORT/index.html" "$OUT/index-mobile.png"
npx --yes playwright@1.52.0 screenshot --browser=chromium --viewport-size="1440,900" "http://127.0.0.1:$PORT/styleguide.html" "$OUT/styleguide-desktop.png"
npx --yes playwright@1.52.0 screenshot --browser=chromium --viewport-size="390,844" "http://127.0.0.1:$PORT/styleguide.html" "$OUT/styleguide-mobile.png"

echo "Snapshot capture complete."
