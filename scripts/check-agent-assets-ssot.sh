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

# --- Skills: .cursor/skills, .claude/skills, skills/ must symlink into .agents/skills ---
for editor_tree in .cursor/skills .claude/skills skills; do
  [[ -d "$editor_tree" ]] || continue
  for entry in "$editor_tree"/*; do
    [[ -e "$entry" ]] || continue
    name="$(basename "$entry")"
    [[ "$name" == "README.md" ]] && continue
    if ! is_symlink "$entry"; then
      fail "$entry is not a symlink (edit .agents/skills/$name only)"
      continue
    fi
    target="$(readlink "$entry")"
    if [[ ! "$target" == *".agents/skills/$name"* ]]; then
      fail "$entry symlinks to unexpected target: $target"
    fi
    if [[ ! -e "$entry" ]]; then
      fail "$entry is a broken symlink"
    fi
  done
done

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

# --- SSOT skill bodies must not be symlinks out of .agents ---
for skill_md in .agents/skills/*/SKILL.md; do
  [[ -f "$skill_md" ]] || continue
  if is_symlink "$skill_md"; then
    fail "$skill_md must be a regular file (SSOT body)"
  fi
done

# --- SSOT rule bodies must not be symlinks out of .agents ---
while IFS= read -r -d '' rule; do
  rel="${rule#./}"
  if is_symlink "$rel"; then
    fail "$rel must be a regular file (SSOT body)"
  fi
done < <(find .agents/rules -name '*.mdc' -print0 2>/dev/null)

# --- OpenCode mirror: copies, not symlinks (partial parity — plan 1.5). Any
# .opencode/skills/<slug>/SKILL.md that has a .agents counterpart must match it byte-for-byte. ---
for skill_md in .opencode/skills/*/SKILL.md; do
  [[ -f "$skill_md" ]] || continue
  slug="$(basename "$(dirname "$skill_md")")"
  ssot=".agents/skills/$slug/SKILL.md"
  [[ -f "$ssot" ]] || continue
  if ! cmp -s "$ssot" "$skill_md"; then
    fail "$skill_md drifted from $ssot (re-copy from .agents; OpenCode mirrors are not symlinked yet — plan 1.5)"
  fi
done

if [[ "$errors" -gt 0 ]]; then
  echo "check-agent-assets-ssot: $errors violation(s). Edit .agents/skills/ and .agents/rules/ only; recreate editor symlinks." >&2
  exit 1
fi

echo "check-agent-assets-ssot: OK"
