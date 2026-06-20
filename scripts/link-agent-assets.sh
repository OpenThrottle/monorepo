#!/usr/bin/env bash
# @description Sync editor views to SSOT: (re)create missing symlinks from .agents/ into editor trees.
# Fixer companion to check-agent-assets-ssot.sh. Idempotent; never touches SSOT bodies.
#   Skills: .agents/skills/<slug>     -> .cursor/skills, .claude/skills, skills/   (per-directory)
#   Rules:  .agents/rules/**/*.mdc    -> .cursor/rules                              (per-file; nx-rules.mdc skipped — generated)
# Flags: --dry-run/-n (preview)  --skills-only  --rules-only
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

DRY_RUN=0
DO_SKILLS=1
DO_RULES=1

usage() {
  echo "usage: link-agent-assets.sh [--dry-run|-n] [--skills-only|--rules-only]" >&2
}

for arg in "$@"; do
  case "$arg" in
    -n | --dry-run) DRY_RUN=1 ;;
    --skills-only) DO_RULES=0 ;;
    --rules-only) DO_SKILLS=0 ;;
    -h | --help)
      usage
      exit 0
      ;;
    *)
      echo "link-agent-assets: unknown argument: $arg" >&2
      usage
      exit 2
      ;;
  esac
done
if [[ "$DO_SKILLS" -eq 0 && "$DO_RULES" -eq 0 ]]; then
  echo "link-agent-assets: --skills-only and --rules-only are mutually exclusive" >&2
  exit 2
fi

created=0
fixed=0
skipped=0

# Relative "../" prefix from a repo-root-relative link path back up to the repo root.
# One ".." per path separator (e.g. .cursor/rules/coding/x.mdc -> ../../../).
rel_prefix() {
  local path="$1" slashes
  slashes="${path//[!\/]/}"
  local out="" i
  for ((i = 0; i < ${#slashes}; i++)); do out="../$out"; done
  printf '%s' "$out"
}

# Ensure `$link` is a symlink to the repo-root-relative SSOT path `$ssot`.
link_one() {
  local link="$1" ssot="$2"
  local target
  target="$(rel_prefix "$link")$ssot"

  if [[ -L "$link" ]]; then
    local current
    current="$(readlink "$link")"
    if [[ "$current" == "$target" && -e "$link" ]]; then
      return 0 # already correct and resolving
    fi
    if [[ "$DRY_RUN" -eq 1 ]]; then
      echo "would fix:    $link -> $target (was: $current)"
    else
      ln -sfn "$target" "$link"
      echo "fixed:        $link -> $target"
    fi
    fixed=$((fixed + 1))
    return 0
  fi

  if [[ -e "$link" ]]; then
    echo "link-agent-assets: SKIP $link is a real file/dir, not a symlink — resolve manually (edit $ssot only)" >&2
    skipped=$((skipped + 1))
    return 0
  fi

  mkdir -p "$(dirname "$link")"
  if [[ "$DRY_RUN" -eq 1 ]]; then
    echo "would create: $link -> $target"
  else
    ln -s "$target" "$link"
    echo "created:      $link -> $target"
  fi
  created=$((created + 1))
}

if [[ "$DO_SKILLS" -eq 1 ]]; then
  [[ -d .agents/skills ]] || {
    echo "link-agent-assets: .agents/skills not found (run from repo root)" >&2
    exit 1
  }
  for skill_dir in .agents/skills/*/; do
    [[ -d "$skill_dir" ]] || continue
    slug="$(basename "$skill_dir")"
    for tree in .cursor/skills .claude/skills skills; do
      link_one "$tree/$slug" ".agents/skills/$slug"
    done
  done
fi

if [[ "$DO_RULES" -eq 1 ]]; then
  [[ -d .agents/rules ]] || {
    echo "link-agent-assets: .agents/rules not found (run from repo root)" >&2
    exit 1
  }
  # Rules mirror to .cursor/rules ONLY (Claude reads CLAUDE.md/AGENTS.md; root skills/ is for skills).
  while IFS= read -r -d '' src; do
    rel="${src#.agents/rules/}"
    [[ "$rel" == "nx-rules.mdc" ]] && continue # generated + gitignored — see check-agent-assets-ssot.sh
    link_one ".cursor/rules/$rel" "$src"
  done < <(find .agents/rules \( -name '*.mdc' -o -name 'README.md' \) -print0)
fi

summary="link-agent-assets: created $created, fixed $fixed, skipped $skipped"
[[ "$DRY_RUN" -eq 1 ]] && summary="$summary (dry-run)"
echo "$summary"

[[ "$skipped" -gt 0 ]] && exit 1
exit 0
