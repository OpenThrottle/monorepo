#!/usr/bin/env bash
# resolve-repo-context.sh — tell a github-* skill what the HOST repo provides.
#
# The github-* skills are synced into repos that are not this monorepo. Each one runs this
# first and branches on its output instead of assuming a file, branch name or hook exists.
# Read-only, offline-first (it never fetches), and it ALWAYS exits 0: a missing thing is a
# value (`none`), never an error, so a skill can fall back instead of failing.
#
# Output: one KEY=VALUE line per key, in this order.
#
#   REPO_ROOT              absolute path of the working tree
#   REMOTE                 `origin` if it exists, else the first remote, else `none`
#   DEFAULT_BRANCH         the remote's default branch name (see ladder below)
#   DEFAULT_BRANCH_SOURCE  which rung answered: symref | gh | remote-ref | local-ref | fallback
#   BASE_REF               `<remote>/<default>` when that ref exists, else `<default>`
#   PR_TEMPLATE            path of the PR template to start from, `choose`, or `none`
#   PR_TEMPLATE_SOURCE     repo | bundled | none
#   PR_TEMPLATE_CHOICES    `|`-separated paths when PR_TEMPLATE=choose, else empty
#   COMMITLINT_CONFIG      path of the commitlint config (or `package.json`), or `none`
#   COMMIT_MSG_HOOK        path of an active commit-msg hook, or `none`
#   ATTRIBUTION_GUARD      path of a POSIX sh script that checks a PR title/body for tool
#                          attribution (run it as `sh "<path>"`), or `none`
#   ATTRIBUTION_GUARD_SOURCE  repo | bundled | none
#   WORKTREE_REMOVE        `pnpm worktree:remove` when the repo defines it, else `git worktree remove`
#   PLAN_IDS               space-separated unique Plan-Id footers in BASE_REF..HEAD, or `none`
#
# Default-branch ladder (first hit wins):
#   1. refs/remotes/<remote>/HEAD          local, instant
#   2. gh repo view --json defaultBranchRef  only when gh is installed and authenticated
#   3. <remote>/main, then <remote>/master  local remote-tracking refs
#   4. local main, then local master
#   5. `main`
#
# OT reachability is NOT checked here — a shell cannot reach the MCP. PLAN_IDS says whether
# the branch is OT work; the skill checks OT itself (openthrottle-mcp `health`) when it is.
#
# This is the only copy. github-commit, github-squash and github-cleanup reach it through a
# relative git symlink in their own scripts/ folder, so there is one file to edit. Foreign-repo
# injection either symlinks the whole skill folder (the inner link still resolves against this
# source) or copies it with symlinks dereferenced, so every skill ends up with a working file.
#
# Usage: bash <skill-dir>/scripts/resolve-repo-context.sh

set -u

script_dir=$(CDPATH='' cd -- "$(dirname -- "$0")" && pwd)
skill_dir=$(dirname -- "$script_dir")

emit() {
  printf '%s=%s\n' "$1" "$2"
}

if ! root=$(git rev-parse --show-toplevel 2>/dev/null); then
  emit REPO_ROOT none
  echo "# not inside a git working tree" >&2
  exit 0
fi
emit REPO_ROOT "$root"
cd "$root" || exit 0

# --- remote -----------------------------------------------------------------------------
remote=none
if git remote | grep -qx origin; then
  remote=origin
else
  first=$(git remote | head -n 1)
  [ -n "$first" ] && remote=$first
fi
emit REMOTE "$remote"

# --- default branch ---------------------------------------------------------------------
default=
rung=
has_ref() {
  git rev-parse --verify --quiet "$1" >/dev/null 2>&1
}

if [ "$remote" != none ]; then
  default=$(git symbolic-ref --quiet --short "refs/remotes/$remote/HEAD" 2>/dev/null | sed "s#^$remote/##")
  [ -n "$default" ] && rung='symref'
fi

if [ -z "$default" ] && [ "$remote" != none ] && command -v gh >/dev/null 2>&1 \
  && gh auth status >/dev/null 2>&1; then
  default=$(gh repo view --json defaultBranchRef --jq '.defaultBranchRef.name' 2>/dev/null || true)
  [ -n "$default" ] && rung='gh'
fi

if [ -z "$default" ] && [ "$remote" != none ]; then
  for candidate in main master; do
    if has_ref "refs/remotes/$remote/$candidate"; then
      default=$candidate
      rung='remote-ref'
      break
    fi
  done
fi

if [ -z "$default" ]; then
  for candidate in main master; do
    if has_ref "refs/heads/$candidate"; then
      default=$candidate
      rung='local-ref'
      break
    fi
  done
fi

if [ -z "$default" ]; then
  default=main
  rung='fallback'
fi
emit DEFAULT_BRANCH "$default"
emit DEFAULT_BRANCH_SOURCE "$rung"

base=$default
if [ "$remote" != none ] && has_ref "refs/remotes/$remote/$default"; then
  base="$remote/$default"
fi
emit BASE_REF "$base"

# --- PR template ------------------------------------------------------------------------
# GitHub reads a single template named pull_request_template.md (any case) from .github/,
# the repo root or docs/, and multiple templates from a PULL_REQUEST_TEMPLATE/ directory in
# the same three places.
template=
choices=
for dir in .github . docs; do
  [ -d "$dir" ] || continue
  hit=$(find "$dir" -maxdepth 1 -type f -iname 'pull_request_template.md' 2>/dev/null | head -n 1)
  if [ -n "$hit" ]; then
    template=${hit#./}
    break
  fi
done

if [ -z "$template" ]; then
  for dir in .github . docs; do
    sub=$(find "$dir" -maxdepth 1 -type d -iname 'pull_request_template' 2>/dev/null | head -n 1)
    [ -n "$sub" ] || continue
    choices=$(find "$sub" -maxdepth 1 -type f -iname '*.md' 2>/dev/null | sed 's#^\./##' | sort | paste -sd '|' -)
    [ -n "$choices" ] && break
  done
fi

if [ -n "$template" ]; then
  emit PR_TEMPLATE "$template"
  emit PR_TEMPLATE_SOURCE repo
  choices=
elif [ -n "$choices" ] && [ "${choices#*|}" = "$choices" ]; then
  emit PR_TEMPLATE "$choices"
  emit PR_TEMPLATE_SOURCE repo
  choices=
elif [ -n "$choices" ]; then
  emit PR_TEMPLATE choose
  emit PR_TEMPLATE_SOURCE repo
elif [ -f "$skill_dir/templates/pull_request_template.md" ]; then
  emit PR_TEMPLATE "$skill_dir/templates/pull_request_template.md"
  emit PR_TEMPLATE_SOURCE bundled
else
  emit PR_TEMPLATE none
  emit PR_TEMPLATE_SOURCE none
fi
emit PR_TEMPLATE_CHOICES "$choices"

# --- commitlint -------------------------------------------------------------------------
commitlint=none
for name in .commitlintrc .commitlintrc.json .commitlintrc.yaml .commitlintrc.yml \
  .commitlintrc.js .commitlintrc.cjs .commitlintrc.mjs .commitlintrc.ts .commitlintrc.cts \
  .commitlintrc.mts commitlint.config.js commitlint.config.cjs commitlint.config.mjs \
  commitlint.config.ts commitlint.config.cts commitlint.config.mts; do
  if [ -f "$name" ]; then
    commitlint=$name
    break
  fi
done
if [ "$commitlint" = none ] && [ -f package.json ] && grep -qE '^[[:space:]]*"commitlint"[[:space:]]*:' package.json; then
  commitlint=package.json
fi
emit COMMITLINT_CONFIG "$commitlint"

# --- commit-msg hook --------------------------------------------------------------------
hook=none
hooks_path=$(git config --get core.hooksPath 2>/dev/null || true)
if [ -n "$hooks_path" ] && [ -x "$hooks_path/commit-msg" ]; then
  hook="$hooks_path/commit-msg"
else
  default_hook=$(git rev-parse --git-path hooks/commit-msg 2>/dev/null || true)
  [ -n "$default_hook" ] && [ -x "$default_hook" ] && hook=$default_hook
fi
emit COMMIT_MSG_HOOK "$hook"

# --- attribution guard ------------------------------------------------------------------
# Prefer the repo's own guard only when its pattern file is there too (the monorepo's
# script sources .husky/utils/attribution-patterns.sh and dies without it).
if [ -x scripts/check-pr-attribution.sh ] && [ -f .husky/utils/attribution-patterns.sh ]; then
  emit ATTRIBUTION_GUARD "$root/scripts/check-pr-attribution.sh"
  emit ATTRIBUTION_GUARD_SOURCE repo
elif [ -f "$script_dir/check-pr-attribution.sh" ]; then
  emit ATTRIBUTION_GUARD "$script_dir/check-pr-attribution.sh"
  emit ATTRIBUTION_GUARD_SOURCE bundled
else
  emit ATTRIBUTION_GUARD none
  emit ATTRIBUTION_GUARD_SOURCE none
fi

# --- worktree removal -------------------------------------------------------------------
if [ -f package.json ] && grep -qE '"worktree:remove"[[:space:]]*:' package.json \
  && command -v pnpm >/dev/null 2>&1; then
  emit WORKTREE_REMOVE 'pnpm worktree:remove'
else
  emit WORKTREE_REMOVE 'git worktree remove'
fi

# --- OT work ----------------------------------------------------------------------------
plans=
if has_ref "$base"; then
  plans=$(git log --format='%b' "$base..HEAD" 2>/dev/null \
    | sed -n 's/^Plan-Id:[[:space:]]*\([0-9a-fA-F-]\{36\}\).*/\1/p' | sort -u | paste -sd ' ' -)
fi
emit PLAN_IDS "${plans:-none}"

exit 0
