#!/usr/bin/env bash
# @description CI drift guard: .agents/ is SSOT; editor trees must be symlinks only.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

errors=0

fail() {
  echo "check-agent-assets-ssot: $*" >&2
  errors=$((errors + 1))
}

is_symlink() {
  local path="$1"
  [[ -L "$path" ]]
}

# --- Skills: ot-skill-sync owns the layout (skills/ = authored SSOT, .agents/skills = merged
# view of skills/ symlinks + lockfile-installed external dirs, <agent>/skills = generated
# fan-out). Its --check validates the whole two-stage pipeline without writing. ---
if ! bash skills/ot-skill-sync/scripts/sync.sh --check; then
  fail "skill layout drift (see ot-skill-sync output above; run: bash skills/ot-skill-sync/scripts/sync.sh)"
fi

# --- Rules: .cursor/rules/**/*.mdc must symlink into .agents/rules (except gitignored nx-rules.mdc) ---
while IFS= read -r -d '' rule; do
  rel="${rule#./}"
  if [[ "$rel" == .cursor/rules/nx-rules.mdc ]]; then
    continue
  fi
  if ! is_symlink "$rel"; then
    fail "$rel is a regular file (edit under .agents/rules/ only)"
    continue
  fi
  if [[ ! -e "$rel" ]]; then
    fail "$rel is a broken symlink"
  fi
done < <(find .cursor/rules -name '*.mdc' -print0 2>/dev/null)

if [[ -f .cursor/rules/README.md ]] && ! is_symlink .cursor/rules/README.md; then
  fail ".cursor/rules/README.md must symlink to .agents/rules/README.md"
fi

# --- SSOT rule bodies must not be symlinks out of .agents ---
while IFS= read -r -d '' rule; do
  rel="${rule#./}"
  if is_symlink "$rel"; then
    fail "$rel must be a regular file (SSOT body)"
  fi
done < <(find .agents/rules -name '*.mdc' -print0 2>/dev/null)

if [[ "$errors" -gt 0 ]]; then
  echo "check-agent-assets-ssot: $errors violation(s). Edit .agents/skills/ and .agents/rules/ only; recreate editor symlinks." >&2
  exit 1
fi

echo "check-agent-assets-ssot: OK"
