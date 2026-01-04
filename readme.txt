cat > readme.txt <<'EOF'
MAPBOX BUILDING GENERATOR — “CODEX PR MACHINE”
=============================================

Goal
----
Turn a single backlog item (TASK-ID) into a clean PR automatically:
TASKS.md ticket -> Codex implements -> commit -> push -> PR -> you review -> merge.

Repo structure (expected)
-------------------------
- AGENTS.md               : standing rules Codex must follow (constraints, PR hygiene)
- codex/TASKS.md          : backlog written as “tickets” (one TASK-ID per PR)
- scripts/codex_pr.sh     : runs the machine (branch -> codex exec -> commit -> push -> PR)

One-time setup
--------------
1) Install tools
   - Git
   - GitHub CLI:
       brew install gh
   - Codex CLI (choose ONE):
       brew install codex
     or
       npm i -g @openai/codex

2) Authenticate
   - GitHub CLI:
       gh auth login
       gh auth status
   - Codex:
       codex login
       codex --version

3) Ensure script is executable
   chmod +x scripts/codex_pr.sh

Ticket format (TASKS.md)
------------------------
Write tasks like:

## BG-001 — Short title
**Problem**
...
**Acceptance**
- ...
**Files**
- index.html
**Manual QA**
1) ...
2) ...

IMPORTANT: One task per PR. Keep tasks small.

Run the machine (create a PR)
-----------------------------
From repo root:

1) Make sure your working tree is clean:
   git status

2) Run:
   ./scripts/codex_pr.sh BG-001

What it does:
- Extracts BG-001 block from codex/TASKS.md
- Creates branch: codex/bg-001-<slug>
- Runs Codex against that task spec
- Commits changes
- Pushes branch
- Opens a PR via GitHub CLI

Preview locally (see changes in browser)
----------------------------------------
From repo root:

Option A (Python):
  python3 -m http.server 8000
  open http://localhost:8000/

Option B (Node):
  npx http-server . -p 8000 -c-1
  open http://localhost:8000/

NOTE: If your JS uses absolute imports like:
  import ... from '/playground/...'
you may need to change them to relative paths (./...) for localhost.

Update the PR with latest default branch, then merge
----------------------------------------------------
If PR is #1:

  gh pr checkout 1
  DEFAULT_BRANCH=$(gh repo view --json defaultBranchRef -q .defaultBranchRef.name)
  git fetch origin
  git rebase origin/$DEFAULT_BRANCH
  git push --force-with-lease
  gh pr merge 1 --squash --delete-branch

If checks are required and still running:
  gh pr merge 1 --squash --auto --delete-branch

Cost control (don’t burn usage)
-------------------------------
- Prefer small tickets: one feature/fix per PR.
- Avoid reruns: make Acceptance + Manual QA explicit.
- Don’t let Codex “refactor for fun”: AGENTS.md should say “small surgical diffs”.
- If you have both “ChatGPT sign-in” and “API key” modes, use sign-in unless you
  explicitly want usage-based API billing.
- Put guardrails in tasks (files list, scope limits) to prevent large edits.

Troubleshooting
---------------
- “codex not found”
  Install Codex CLI (brew install codex OR npm i -g @openai/codex), then restart terminal.

- “bad substitution” on ${VAR,,}
  You’re likely on macOS Bash 3.2. Use tr-based lowercasing in the script (already recommended).

- TASK_FILE case mismatch
  Ensure the script references codex/TASKS.md exactly (case matters on some systems).

EOF
