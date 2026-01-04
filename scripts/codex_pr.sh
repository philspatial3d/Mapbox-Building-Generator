#!/usr/bin/env bash
set -euo pipefail

TASK_ID="${1:?Usage: $0 BG-001}"
TASK_FILE="codex/TASKS.md"

command -v codex >/dev/null || { echo "codex not found"; exit 1; }
command -v gh >/dev/null || { echo "gh not found"; exit 1; }

# Extract the task block: from "## BG-xxx" to next "## "
TASK_BLOCK="$(awk -v id="$TASK_ID" '
  $0 ~ "^## "id" " {flag=1}
  flag && $0 ~ "^## " && $0 !~ "^## "id" " {exit}
  flag {print}
' "$TASK_FILE")"

if [[ -z "${TASK_BLOCK// }" ]]; then
  echo "Could not find task $TASK_ID in $TASK_FILE"
  exit 1
fi

# Build a safe branch name (works on macOS Bash 3.2)
FIRST_LINE="$(echo "$TASK_BLOCK" | head -n1)"

# Strip "## BG-001 — " (supports em dash or hyphen)
TITLE="$(echo "$FIRST_LINE" | sed -E "s/^##[[:space:]]*$TASK_ID[[:space:]]*[—-][[:space:]]*//")"

# slugify title
SLUG="$(echo "$TITLE" \
  | tr '[:upper:]' '[:lower:]' \
  | sed -E 's/[^a-z0-9]+/-/g; s/^-+//; s/-+$//' \
  | cut -c1-40)"

TASK_ID_LC="$(echo "$TASK_ID" | tr '[:upper:]' '[:lower:]')"
BRANCH="codex/${TASK_ID_LC}-${SLUG}"
git checkout -b "$BRANCH"

# Run Codex non-interactively. The trailing "-" tells codex exec to read the prompt from stdin. :contentReference[oaicite:6]{index=6}
PROMPT="$(cat <<'EOF'
You are working in the Mapbox Building Generator repo.
Follow AGENTS.md.
Implement exactly ONE task from the backlog.
Do not refactor unrelated code.
When done: ensure no obvious runtime errors and update codex/TASKS.md status for this task.

TASK SPEC:
EOF
)"

# Capture Codex’s final summary for the PR body. :contentReference[oaicite:7]{index=7}
tmp_summary="$(mktemp)"

printf "%s\n\n%s\n" "$PROMPT" "$TASK_BLOCK" | \
  codex exec --full-auto --output-last-message "$tmp_summary" -  # flags may be set in config.toml :contentReference[oaicite:8]{index=8}

# Optional: run whatever checks exist
if [[ -f package.json ]]; then
  npm test || true
fi

git add -A
git commit -m "$TASK_ID: $(echo "$TASK_BLOCK" | head -n1 | sed -E 's/^## [^—]+— //')"

git push -u origin "$BRANCH"

TITLE="$(echo "$TASK_BLOCK" | head -n1 | sed -E 's/^## //')"
BODY="$(cat <<EOF
$TITLE

$(cat "$tmp_summary")

## Manual QA
(From codex/TASKS.md)
EOF
)"

echo "$BODY" > /tmp/pr-body.txt
gh pr create --title "$TITLE" --body-file /tmp/pr-body.txt
