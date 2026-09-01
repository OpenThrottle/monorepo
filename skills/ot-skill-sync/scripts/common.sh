#!/bin/bash
# Shared config and helpers for the ot-skill-sync skill.
# Sourced by sync.sh and cleanup.sh — not executed directly.
#
# Everything is relative to the git repository the caller is inside; these
# scripts have no notion of a "parent" repo and work identically whether the
# skill is run from its source location or an installed copy.

# Colors for output
BLUE='\033[0;34m'
GREEN='\033[0;32m'
NC='\033[0m'
RED='\033[0;31m'
YELLOW='\033[1;33m'

# ── The architecture ─────────────────────────────────────────────────────────
# skills/           hand-authored skills, committed (SKILLS_SRC_DIR)
# .agents/skills/   the merged SSOT view every universal tool reads:
#                   real directories = installed by `npx skills` when the slug is
#                   in the lockfile, otherwise repo-authored (custom) — either
#                   way never touched here; symlinks = our authored skills,
#                   generated
# <agent>/skills/   per-agent fan-out for tools that don't read .agents/skills
#                   natively (AGENT_SKILL_DIRS) — fully generated. Currently
#                   .claude/skills (Claude Code) + .gemini/skills (Gemini CLI).
#
# Ownership is encoded by on-disk type, so no side-ledger is needed: inside
# .agents/skills/ a REAL DIRECTORY is owned by the repo it sits in — a vendored
# install when the lockfile claims its slug, repo-authored (custom) when it does
# not — and a SYMLINK is ours, generated; every entry in an agent fan-out dir is
# a generated symlink. Sync treats both kinds of real directory identically:
# never touched. The sync and cleanup passes read that distinction straight off
# the filesystem.
SKILLS_SRC_DIR="skills"
UNIVERSAL_DIR=".agents/skills"
LOCKFILE_NAME="skills-lock.json"

# Per-agent fan-out targets: the dirs used by CLIs that do NOT read
# .agents/skills/ in-repo, so stage 1 alone never reaches them.
#   .claude/skills  → Claude Code (only .claude/skills), and also read by Cursor + Grok
#   .gemini/skills  → Gemini CLI (project scope; its only in-repo skills dir)
# Antigravity (agy) needs no fan-out — it reads <workspace>/.agents/skills/ natively,
# so stage 1 already covers it. See SKILL.md § "Which CLI reads what" for the
# verified matrix, including the two CLIs no in-repo dir reaches (codex, opencode).
# Override per repo (survives skill updates) with a space-separated env var, e.g.:
#   AGENT_SKILL_DIRS=".claude/skills .gemini/skills .opencode/skill"
AGENT_SKILL_DIRS_DEFAULT=".claude/skills .gemini/skills"
AGENT_SKILL_DIRS="${AGENT_SKILL_DIRS:-$AGENT_SKILL_DIRS_DEFAULT}"

# ── The personal (per-user) tier ─────────────────────────────────────────────
# A third source root, OUTSIDE the repo: ~/.openthrottle/skills/<name>/SKILL.md.
# Personal skills ride the exact same pipeline a committed skill does — stage 1
# links them into .agents/skills/, stage 2 fans them out — but their content
# never enters the worktree, so the only in-repo artifact is a symlink the
# managed .gitignore block already covers.
#
# Opt-in is PRESENCE: if the root exists and holds at least one directory with a
# readable SKILL.md, sync uses it. There is deliberately no enable/disable env
# var for the in-repo tier (OPENTHROTTLE_PERSONAL_SKILLS_ENABLED remains the
# foreign-injection toggle and nothing else) — creating the directory is already
# the deliberate act. An absent or empty root is a clean no-op everywhere.
#
# The default path and the override variable name are a CONTRACT shared with the
# TypeScript injection path (resolvePersonalSkillsRoot in
# packages/openthrottle-agentic-utils). Change one, change both — a test asserts
# they agree. See docs/monorepo/foreign-workspace-skill-injection.md §7.
PERSONAL_SKILLS_DIR_ENV="OPENTHROTTLE_PERSONAL_SKILLS_DIR"
PERSONAL_SKILLS_DIR_DEFAULT="${HOME:-}/.openthrottle/skills"

# Print the personal skills root: the OPENTHROTTLE_PERSONAL_SKILLS_DIR override
# when non-empty, else the default. Always without a trailing slash. This prints
# a path whether or not it exists — callers test for existence themselves, since
# "missing" and "empty" behave identically (no-op).
resolve_personal_skills_root() {
  local override="${OPENTHROTTLE_PERSONAL_SKILLS_DIR:-}"
  if [ -n "$override" ]; then
    printf '%s\n' "${override%/}"
    return 0
  fi
  printf '%s\n' "${PERSONAL_SKILLS_DIR_DEFAULT%/}"
}

# True when $1 is $2 or lies beneath it. Pure string comparison on already
# canonicalized paths — never touches the filesystem, so it is safe on a
# dangling link's recorded target.
path_is_under() {
  local path="${1%/}"
  local root="${2%/}"
  [ -n "$root" ] || return 1
  [ "$path" = "$root" ] || [ "${path#"$root"/}" != "$path" ]
}

# True when the newline-separated list on stdin ($2) contains the exact name $1.
name_in_list() {
  [ -n "$2" ] || return 1
  printf '%s\n' "$2" | grep -qFx "$1"
}

# Absolute path a symlink points at, WITHOUT requiring the target to exist.
# canonical_path cannot answer this: given a dangling link it canonicalizes the
# link's own path, not the target's. Needed to classify a broken link — the
# common case being a personal skill deleted or renamed outside the repo, where
# knowing the tier is the difference between a useful message and a shrug.
# Returns 1 when the target's parent chain is gone too (nothing to say).
link_target_absolute() {
  local link="$1"
  local raw parent target_parent
  raw=$(readlink "$link") || return 1
  case "$raw" in
    /*) printf '%s\n' "$raw"; return 0 ;;
  esac
  parent=$(dirname "$link")
  target_parent=$(cd "$parent" >/dev/null 2>&1 && cd "$(dirname "$raw")" >/dev/null 2>&1 && pwd -P) || return 1
  printf '%s/%s\n' "$target_parent" "$(basename "$raw")"
}

# True when a symlink — live OR dangling — points into the currently-resolved
# personal root. Classification only; says nothing about whether it is still a
# skill there.
link_points_into_personal_root() {
  local link="$1"
  local root="$2"
  local target
  [ -n "$root" ] || return 1
  # Canonicalize the root before comparing: link_target_absolute resolves via
  # `pwd -P`, so on macOS it yields /private/var/... while a configured root
  # reads /var/... . Two spellings of one directory compare unequal, and the
  # classification silently degrades to "not personal".
  [ -d "$root" ] && root="$(canonical_path "$root")"
  target=$(link_target_absolute "$link") || return 1
  path_is_under "$target" "$root"
}

# Personal skill names (one per line): direct children of the personal root that
# are directories (or links to directories) holding a readable SKILL.md — the
# same rule discoverSkillDirs applies. Anything else is not a skill and is left
# for the caller to warn about. Empty output for a missing or empty root.
personal_skill_names() {
  local root="$1"
  [ -d "$root" ] || return 0
  local entry
  for entry in "$root"/*; do
    [ -d "$entry" ] || continue
    [ -r "$entry/SKILL.md" ] || continue
    basename "$entry"
  done
}

# Markers bracketing our managed .gitignore block
GITIGNORE_START_MARKER="# Start 🔄 Managed by OpenThrottle ot-skill-sync"
GITIGNORE_END_MARKER="# End 🔄 Managed by OpenThrottle ot-skill-sync"

# Resolve the repo we operate on: the git toplevel of the current directory.
# Sets REPO_ROOT or returns 1.
detect_repo_root() {
  REPO_ROOT=$(git rev-parse --show-toplevel 2>/dev/null) || {
    echo -e "${RED}Error: not inside a git repository. Run this from the repo you want to sync.${NC}" >&2
    return 1
  }
}

# Validate every AGENT_SKILL_DIRS entry before any of it is used to create
# symlinks, emit .gitignore rules, or prune directories. Reject a fan-out target
# that escapes the repo, aliases the repo root, or overlaps the authored
# (SKILLS_SRC_DIR) or universal (UNIVERSAL_DIR) trees — otherwise sync/cleanup
# would touch unrelated files, and the managed ignore rule would hide committed
# content (authored skills or installed externals). Returns 1 on the first bad
# entry so callers can abort. Pure string checks — safe to run before REPO_ROOT.
validate_agent_skill_dirs() {
  local dir norm reserved
  for dir in $AGENT_SKILL_DIRS; do
    norm="${dir%/}"
    case "$norm" in
      "" | ".")
        echo -e "${RED}Error: invalid AGENT_SKILL_DIRS entry '$dir' (empty or the repo root).${NC}" >&2
        return 1 ;;
      /* | "~"*)
        echo -e "${RED}Error: AGENT_SKILL_DIRS entry '$dir' must be a repo-relative path.${NC}" >&2
        return 1 ;;
      ".." | "../"* | *"/../"* | *"/..")
        echo -e "${RED}Error: AGENT_SKILL_DIRS entry '$dir' escapes the repository.${NC}" >&2
        return 1 ;;
    esac

    for reserved in "$SKILLS_SRC_DIR" "$UNIVERSAL_DIR"; do
      # Overlap in either direction: exact, entry under reserved, or reserved under entry.
      if [ "$norm" = "$reserved" ] \
        || [ "${norm#"$reserved"/}" != "$norm" ] \
        || [ "${reserved#"$norm"/}" != "$reserved" ]; then
        echo -e "${RED}Error: AGENT_SKILL_DIRS entry '$dir' overlaps '$reserved' (would target or hide authored/installed skills).${NC}" >&2
        return 1
      fi
    done
  done
  return 0
}

# Fully canonicalize a path: resolves every symlink component (like readlink -f)
# Works for directories, dir-symlinks, and files, without requiring GNU readlink.
canonical_path() {
  local p="$1"
  if [ -d "$p" ]; then
    (cd "$p" >/dev/null 2>&1 && pwd -P)
  else
    local d
    d=$(cd "$(dirname "$p")" >/dev/null 2>&1 && pwd -P) || return 1
    echo "$d/$(basename "$p")"
  fi
}

# Relative path from one path to another, for symlink creation.
# Works for files and directories (the basename may be a directory).
relative_path() {
  local from="$1"
  local to="$2"
  local from_dir=$(cd "$(dirname "$from")" && pwd)
  local to_dir=$(cd "$(dirname "$to")" && pwd)
  local to_file=$(basename "$to")
  local common_part="$from_dir"
  local result=""

  while [ "${to_dir#$common_part}" = "$to_dir" ]; do
    common_part=$(dirname "$common_part")
    result="../$result"
  done

  local forward_part="${to_dir#$common_part/}"
  if [ -n "$forward_part" ]; then
    result="${result}${forward_part}/"
  fi
  echo "${result}${to_file}"
}

# Skill names from the lockfile (one per line). Empty if no lockfile.
lockfile_skill_names() {
  local lockfile="$REPO_ROOT/$LOCKFILE_NAME"
  [ -f "$lockfile" ] || return 0
  if command -v node >/dev/null 2>&1; then
    node -e "const l=require(process.argv[1]);console.log(Object.keys(l.skills||{}).join('\n'))" "$lockfile" 2>/dev/null || true
  elif command -v python3 >/dev/null 2>&1; then
    python3 -c "import json,sys;print('\n'.join(json.load(open(sys.argv[1])).get('skills',{}).keys()))" "$lockfile" 2>/dev/null || true
  else
    # Last-resort: grep top-level keys two levels deep (good enough for this format)
    grep -oE '^    "[^"]+"' "$lockfile" | tr -d ' "' || true
  fi
}

# ── .gitignore block management ──────────────────────────────────────────────
# The generated layout is fully deterministic, so the ignore rules are static —
# one block, no per-skill churn:
#
#     .agents/skills/*        ignore everything directly under .agents/skills/…
#     !.agents/skills/*/      …except real directories (vendored installs and
#                             repo-authored custom skills alike). Git treats a
#                             symlink as a file, not a directory, so our authored
#                             symlinks stay ignored while real directories remain
#                             committable.
#     <agent_dir>/            each fan-out dir is 100% generated → ignore wholesale
#
# The block is derived from AGENT_SKILL_DIRS, so an override just changes which
# fan-out lines appear. No file lists the individual links.

# Emit the body of our managed block (everything between the markers).
gitignore_block_body() {
  echo "$UNIVERSAL_DIR/*"
  echo "!$UNIVERSAL_DIR/*/"
  local agent_dir
  for agent_dir in $AGENT_SKILL_DIRS; do
    echo "${agent_dir%/}/"
  done
}

# Emit the complete managed block exactly as it should appear in .gitignore:
# start marker, body, end marker. The single source of truth for both writing
# the block and validating it in --check.
gitignore_block_expected() {
  echo "$GITIGNORE_START_MARKER"
  gitignore_block_body
  echo "$GITIGNORE_END_MARKER"
}

# Print the managed block currently in .gitignore (start marker through its end
# marker, or through the next blank/EOF for a legacy block with no end marker).
# Empty output means the marker is absent.
gitignore_block_current() {
  local gitignore_file="$REPO_ROOT/.gitignore"
  [ -f "$gitignore_file" ] || return 0
  awk -v marker="$GITIGNORE_START_MARKER" -v end_marker="$GITIGNORE_END_MARKER" '
    { buf[NR] = $0 }
    END {
      m = 0
      for (i = 1; i <= NR; i++) if (buf[i] == marker) { m = i; break }
      if (m == 0) exit
      end = 0
      for (i = m + 1; i <= NR; i++) if (buf[i] == end_marker) { end = i; break }
      if (end == 0) {
        end = m
        for (i = m + 1; i <= NR; i++) { if (buf[i] == "") break; end = i }
      }
      for (i = m; i <= end; i++) print buf[i]
    }
  ' "$gitignore_file"
}

# Remove our managed block from .gitignore, preserving any user-owned lines that
# follow it. The block spans GITIGNORE_START_MARKER through its matching end marker; a
# single blank separator immediately before the marker is dropped too. Blocks
# written before the end marker existed (no end marker) fall back to ending at
# the next blank line or EOF.
remove_gitignore_block() {
  local gitignore_file="$REPO_ROOT/.gitignore"
  [ -f "$gitignore_file" ] || return 0
  grep -qF "$GITIGNORE_START_MARKER" "$gitignore_file" || return 0
  local tmp
  tmp=$(mktemp)
  awk -v marker="$GITIGNORE_START_MARKER" -v end_marker="$GITIGNORE_END_MARKER" '
    { buf[NR] = $0 }
    END {
      # Locate the start marker.
      m = 0
      for (i = 1; i <= NR; i++) if (buf[i] == marker) { m = i; break }
      if (m == 0) { for (i = 1; i <= NR; i++) print buf[i]; exit }
      # Prefer the explicit end marker; else fall back to the next blank/EOF.
      end = 0
      for (i = m + 1; i <= NR; i++) if (buf[i] == end_marker) { end = i; break }
      if (end == 0) {
        end = m
        for (i = m + 1; i <= NR; i++) { if (buf[i] == "") break; end = i }
      }
      # Also drop one blank separator directly before the marker.
      start = m
      if (m > 1 && buf[m-1] == "") start = m - 1
      for (i = 1; i < start; i++) print buf[i]
      for (i = end + 1; i <= NR; i++) print buf[i]
    }
  ' "$gitignore_file" > "$tmp"
  cat "$tmp" > "$gitignore_file"
  rm -f "$tmp"
}

# Write (or rewrite) our managed block at the end of .gitignore. Idempotent.
ensure_gitignore_block() {
  local gitignore_file="$REPO_ROOT/.gitignore"
  remove_gitignore_block
  {
    [ -s "$gitignore_file" ] && echo ""
    gitignore_block_expected
  } >> "$gitignore_file"
}
