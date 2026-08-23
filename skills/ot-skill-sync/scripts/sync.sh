#!/bin/bash
# ot-skill-sync — sync the current repo's skills into the standard layout.
#
# Two-stage pipeline (see common.sh for the architecture):
#   Stage 1  skills/<name>            →  .agents/skills/<name>   (symlink)
#   Stage 2  .agents/skills/<name>    →  <agent_dir>/<name>      (symlink)
#            for each agent_dir in AGENT_SKILL_DIRS
#
# Ownership rule inside .agents/skills/: a REAL DIRECTORY is owned by
# `npx skills` + skills-lock.json and is never touched; a SYMLINK is ours.
# A name collision between skills/ and the lockfile is an error.
#
# Usage:
#   sync.sh            # sync the repo you're currently in
#   sync.sh --check    # validate only (no writes); exit 1 on any drift
#
# There is no side-ledger: generated links are exactly the symlinks under
# .agents/skills/ and the agent fan-out dirs, and a single static .gitignore
# block keeps them out of git.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/common.sh"

CHECK_MODE=false
if [ "${1:-}" = "--check" ]; then
  CHECK_MODE=true
elif [ $# -gt 0 ]; then
  echo "Usage: $0 [--check]" >&2
  exit 1
fi

detect_repo_root || exit 1
validate_agent_skill_dirs || exit 1

VIOLATIONS=0
violation() {
  VIOLATIONS=$((VIOLATIONS + 1))
  echo -e "${RED}✗ $1${NC}"
}

# Ensure an AGENT_SKILL_DIRS entry is a real directory. Legacy layouts often
# symlink e.g. .claude/skills → ../skills; stage 2 would then write fan-out
# links into SKILLS_SRC_DIR. Replace that symlink with a real directory.
ensure_agent_skill_dir() {
  local agent_dir="$1"
  local target="$REPO_ROOT/$agent_dir"

  if [ -L "$target" ]; then
    local resolved
    resolved=$(canonical_path "$target")
    if [ "$CHECK_MODE" = true ]; then
      violation "$agent_dir is a symlink to ${resolved#$REPO_ROOT/} (expected a real directory — a link into $SKILLS_SRC_DIR/ causes fan-out pollution)"
      return 1
    fi
    echo -e "- ${YELLOW} Replacing $agent_dir symlink with a real directory (was → ${resolved#$REPO_ROOT/})${NC}"
    if ! rm "$target"; then
      echo -e "- ${YELLOW} Skipping agent dir $agent_dir (could not remove symlink)${NC}"
      return 1
    fi
    if [ -e "$target" ] || [ -L "$target" ]; then
      echo -e "- ${YELLOW} Skipping agent dir $agent_dir (symlink still present after removal)${NC}"
      return 1
    fi
    if ! mkdir -p "$target"; then
      echo -e "- ${YELLOW} Skipping agent dir $agent_dir (could not create directory)${NC}"
      return 1
    fi
    return 0
  fi

  if [ ! -e "$target" ]; then
    [ "$CHECK_MODE" = true ] && return 0
    if ! mkdir -p "$target"; then
      echo -e "- ${YELLOW} Skipping agent dir $agent_dir (could not create directory)${NC}"
      return 1
    fi
    return 0
  fi

  if [ ! -d "$target" ]; then
    if [ "$CHECK_MODE" = true ]; then
      violation "$agent_dir exists but is not a directory"
    else
      echo -e "- ${YELLOW} Skipping agent dir $agent_dir (exists but is not a directory)${NC}"
    fi
    return 1
  fi
  return 0
}

# Ensure a symlink exists at $2 (repo-root-relative) pointing to $1 (absolute).
# In check mode, report instead of create. Returns 1 on conflict.
ensure_link() {
  local source_abs="$1"
  local rel="$2"
  local target="$REPO_ROOT/$rel"
  local parent
  parent="$(dirname "$target")"

  # Refuse to materialize links whose parent resolves to SKILLS_SRC_DIR —
  # that directory is hand-authored only. Catches legacy agent-dir symlinks
  # that point at skills/ even when $rel still looks like .claude/skills/...
  if [ -e "$parent" ] || [ -L "$parent" ]; then
    local parent_canonical skills_canonical
    parent_canonical=$(canonical_path "$parent")
    if skills_canonical=$(canonical_path "$REPO_ROOT/$SKILLS_SRC_DIR" 2>/dev/null); then
      if [ "$parent_canonical" = "$skills_canonical" ]; then
        if [ "$CHECK_MODE" = true ]; then
          violation "$rel would land inside $SKILLS_SRC_DIR/ (agent skill dir is probably a symlink into it — run sync.sh)"
        else
          echo -e "- ${YELLOW} Skipping $rel (parent resolves to $SKILLS_SRC_DIR/)${NC}"
        fi
        return 1
      fi
    fi
  fi

  if [ -L "$target" ]; then
    local resolved
    resolved=$(canonical_path "$target")
    if [ "$resolved" = "$(canonical_path "$source_abs")" ]; then
      return 0
    fi
    if [ "$CHECK_MODE" = true ]; then
      violation "$rel is a symlink to the wrong target ($resolved)"
      return 1
    fi
    # A symlink here is always ours (external installs are real directories), so
    # a wrong target is a repairable generated link — replace it, don't skip.
    if ! rm "$target"; then
      echo -e "- ${YELLOW} Skipping $rel (could not remove mismatched symlink)${NC}"
      return 1
    fi
    if ! ln -s "$(relative_path "$target" "$source_abs")" "$target"; then
      echo -e "- ${YELLOW} Skipping $rel (could not recreate symlink)${NC}"
      return 1
    fi
    echo -e "    ${GREEN}🔗 Relinked: $rel${NC}"
    return 0
  elif [ -e "$target" ]; then
    if [ "$CHECK_MODE" = true ]; then
      violation "$rel exists but is not a symlink (expected link to ${source_abs#$REPO_ROOT/})"
    else
      echo -e "- ${YELLOW} Skipping $rel (local file/dir exists)${NC}"
    fi
    return 1
  else
    if [ "$CHECK_MODE" = true ]; then
      violation "$rel is missing (run sync.sh)"
      return 1
    fi
    if ! mkdir -p "$parent"; then
      echo -e "- ${YELLOW} Skipping $rel (could not create parent directory)${NC}"
      return 1
    fi
    if ! ln -s "$(relative_path "$target" "$source_abs")" "$target"; then
      echo -e "- ${YELLOW} Skipping $rel (could not create symlink)${NC}"
      return 1
    fi
    echo -e "    ${GREEN}✅ Linked: $rel${NC}"
    return 0
  fi
}

if [ "$CHECK_MODE" = false ]; then
  echo -e "${GREEN}Syncing skills in: $REPO_ROOT${NC}"
  echo -e "- ${BLUE}Stage 1:${NC} $SKILLS_SRC_DIR/* → $UNIVERSAL_DIR/"
  echo -e "- ${BLUE}Stage 2:${NC} $UNIVERSAL_DIR/* → $AGENT_SKILL_DIRS"
  echo ""
  ensure_gitignore_block
  # Migration: drop the legacy per-link ledger. It is no longer written, and once
  # our .gitignore block stops listing it, a leftover copy would become tracked.
  if [ -f "$REPO_ROOT/.gitignore-symlinks" ]; then
    rm "$REPO_ROOT/.gitignore-symlinks"
    echo -e "    ${YELLOW}🗑️  Removed legacy .gitignore-symlinks${NC}"
  fi
else
  echo -e "${GREEN}Checking skill layout in: $REPO_ROOT${NC}"
  echo ""
  if [ -f "$REPO_ROOT/.gitignore-symlinks" ]; then
    violation "legacy .gitignore-symlinks present (run sync.sh to migrate — the ledger is no longer used)"
  fi
fi

LOCKED_NAMES=$(lockfile_skill_names)

# Agent fan-out roots must be real directories before stage 2 (and before we
# trust paths like .claude/skills/<name> not to alias into skills/).
for agent_dir in $AGENT_SKILL_DIRS; do
  ensure_agent_skill_dir "$agent_dir" || true
done

# ── Stage 1: authored skills → the universal dir ─────────────────────────────

if [ -d "$REPO_ROOT/$SKILLS_SRC_DIR" ]; then
  # No trailing slash on the glob: macOS bash `*/` skips symlinks (including
  # dangling pollution left by a legacy .claude/skills → skills/ layout).
  for skill_source in "$REPO_ROOT/$SKILLS_SRC_DIR"/*; do
    [ -e "$skill_source" ] || [ -L "$skill_source" ] || continue
    skill_name=$(basename "$skill_source")

    # Authored skills are always real directories. Symlinks here are usually
    # stage-2 pollution from a legacy .claude/skills → skills/ layout.
    if [ -L "$skill_source" ]; then
      if [ "$CHECK_MODE" = true ]; then
        violation "$SKILLS_SRC_DIR/$skill_name is a symlink (authored skills must be real directories — run sync.sh)"
      elif rm "$skill_source"; then
        echo -e "    ${YELLOW}🗑️  Removed polluted link: $SKILLS_SRC_DIR/$skill_name${NC}"
      else
        violation "could not remove polluted link $SKILLS_SRC_DIR/$skill_name"
      fi
      continue
    fi

    [ -d "$skill_source" ] || continue

    if [ ! -f "$skill_source/SKILL.md" ]; then
      echo -e "- ${YELLOW} Skipping $SKILLS_SRC_DIR/$skill_name (no SKILL.md)${NC}"
      continue
    fi

    # Invariant: no name collision with a lockfile-managed skill
    if echo "$LOCKED_NAMES" | grep -qFx "$skill_name"; then
      violation "name collision: '$skill_name' exists in both $SKILLS_SRC_DIR/ and $LOCKFILE_NAME — rename the authored skill or remove the installed one"
      continue
    fi

    ensure_link "$skill_source" "$UNIVERSAL_DIR/$skill_name" || true
  done
fi

# In check mode, verify every lockfile skill is materialized (invariant 2):
# a real directory, or our symlink to the same-named $SKILLS_SRC_DIR/ source.
# A symlink to any other target is a rogue install masquerading as the entry.
if [ "$CHECK_MODE" = true ] && [ -n "$LOCKED_NAMES" ]; then
  while IFS= read -r locked; do
    [ -z "$locked" ] && continue
    locked_target="$REPO_ROOT/$UNIVERSAL_DIR/$locked"
    if [ -L "$locked_target" ]; then
      resolved=$(canonical_path "$locked_target")
      if [ "$resolved" != "$(canonical_path "$REPO_ROOT")/$SKILLS_SRC_DIR/$locked" ]; then
        violation "$UNIVERSAL_DIR/$locked is a symlink to an unrelated target ($resolved), not lockfile entry '$locked'"
      fi
    elif [ ! -d "$locked_target" ]; then
      violation "$UNIVERSAL_DIR/$locked missing for lockfile entry '$locked' (run: npx skills experimental_install)"
    fi
  done <<< "$LOCKED_NAMES"
fi

# In check mode, verify .agents/skills contains nothing unaccounted for (invariant 3)
if [ "$CHECK_MODE" = true ] && [ -d "$REPO_ROOT/$UNIVERSAL_DIR" ]; then
  for entry in "$REPO_ROOT/$UNIVERSAL_DIR"/*; do
    [ -e "$entry" ] || [ -L "$entry" ] || continue
    name=$(basename "$entry")
    if [ -L "$entry" ]; then
      if [ ! -e "$entry" ]; then
        violation "$UNIVERSAL_DIR/$name is a dangling generated link (run sync.sh)"
        continue
      fi
      resolved=$(canonical_path "$entry")
      case "$resolved" in
        "$(canonical_path "$REPO_ROOT")/$SKILLS_SRC_DIR/"*) : ;;
        *) violation "$UNIVERSAL_DIR/$name is a symlink pointing outside $SKILLS_SRC_DIR/ ($resolved)" ;;
      esac
    elif [ -d "$entry" ]; then
      if ! echo "$LOCKED_NAMES" | grep -qFx "$name"; then
        violation "$UNIVERSAL_DIR/$name is a real directory but not in $LOCKFILE_NAME (hand-authored skills belong in $SKILLS_SRC_DIR/)"
      fi
    fi
  done
fi

# ── Stage 2: the universal dir → per-agent folders ───────────────────────────

if [ -d "$REPO_ROOT/$UNIVERSAL_DIR" ]; then
  for skill_entry in "$REPO_ROOT/$UNIVERSAL_DIR"/*/; do
    [ -e "${skill_entry%/}" ] || continue
    skill_entry="${skill_entry%/}"
    skill_name=$(basename "$skill_entry")
    [ -f "$skill_entry/SKILL.md" ] || continue

    for agent_dir in $AGENT_SKILL_DIRS; do
      ensure_link "$skill_entry" "$agent_dir/$skill_name" || true
    done
  done
fi

# ── Reconcile removals (sync mode) ───────────────────────────────────────────
# A generated symlink whose source no longer exists — a skill renamed, removed,
# or a rogue link — is deleted. Real directories (external installs) are never
# touched. The desired set is derived live from skills/ and .agents/skills/, so
# no recorded inventory is needed.
if [ "$CHECK_MODE" = false ]; then
  # Stage 1: an .agents/skills symlink must map to an authored skills/<name>.
  if [ -d "$REPO_ROOT/$UNIVERSAL_DIR" ]; then
    for entry in "$REPO_ROOT/$UNIVERSAL_DIR"/*; do
      [ -L "$entry" ] || continue
      name=$(basename "$entry")
      if [ ! -e "$entry" ] || [ ! -f "$REPO_ROOT/$SKILLS_SRC_DIR/$name/SKILL.md" ]; then
        rm "$entry"
        echo -e "    ${YELLOW}🗑️  Removed stale link: $UNIVERSAL_DIR/$name${NC}"
      fi
    done
  fi
  # Stage 2: an agent-dir symlink must map to a live .agents/skills/<name>.
  for agent_dir in $AGENT_SKILL_DIRS; do
    [ -d "$REPO_ROOT/$agent_dir" ] || continue
    for entry in "$REPO_ROOT/$agent_dir"/*; do
      [ -L "$entry" ] || continue
      name=$(basename "$entry")
      if [ ! -e "$entry" ] || [ ! -e "$REPO_ROOT/$UNIVERSAL_DIR/$name" ]; then
        rm "$entry"
        echo -e "    ${YELLOW}🗑️  Removed stale link: $agent_dir/$name${NC}"
      fi
    done
  done
fi

# In check mode, verify agent dirs contain nothing extra, and that no rogue
# agent skill dir exists outside the configured list (invariant 5)
if [ "$CHECK_MODE" = true ]; then
  for agent_dir in $AGENT_SKILL_DIRS; do
    [ -d "$REPO_ROOT/$agent_dir" ] || continue
    for entry in "$REPO_ROOT/$agent_dir"/*; do
      [ -e "$entry" ] || [ -L "$entry" ] || continue
      name=$(basename "$entry")
      if [ -L "$entry" ] && [ ! -e "$entry" ]; then
        violation "$agent_dir/$name is a dangling generated link (run sync.sh)"
      elif [ ! -e "$REPO_ROOT/$UNIVERSAL_DIR/$name" ]; then
        violation "$agent_dir/$name has no counterpart in $UNIVERSAL_DIR/"
      fi
    done
  done

  for candidate in "$REPO_ROOT"/.*/skills; do
    case "$candidate" in */./skills|*/../skills) continue ;; esac
    [ -d "$candidate" ] || continue
    rel="${candidate#$REPO_ROOT/}"
    [ "$rel" = "$UNIVERSAL_DIR" ] && continue
    found=false
    for agent_dir in $AGENT_SKILL_DIRS; do
      [ "$rel" = "$agent_dir" ] && found=true
    done
    if [ "$found" = false ]; then
      violation "unexpected agent skill dir: $rel (not in AGENT_SKILL_DIRS — install skills with --agent universal, then sync)"
    fi
  done
fi

# In check mode, verify our managed .gitignore block matches what sync would
# write — exact marker, rules, and end marker — and that every generated link is
# covered (invariant 6). The exact-block comparison catches missing, stale, or
# extra managed content even when the managed dirs are empty or the links happen
# to be ignored by some other rule.
if [ "$CHECK_MODE" = true ]; then
  current_block=$(gitignore_block_current)
  if [ -z "$current_block" ]; then
    violation "the '$GITIGNORE_START_MARKER' block is missing from .gitignore (run sync.sh)"
  elif [ "$current_block" != "$(gitignore_block_expected)" ]; then
    violation "the managed .gitignore block is stale (rules differ from what sync writes — run sync.sh)"
  fi
  for agent_dir in $AGENT_SKILL_DIRS $UNIVERSAL_DIR; do
    [ -d "$REPO_ROOT/$agent_dir" ] || continue
    for entry in "$REPO_ROOT/$agent_dir"/*; do
      [ -L "$entry" ] || continue
      rel="${entry#$REPO_ROOT/}"
      if ! git -C "$REPO_ROOT" check-ignore -q "$rel" 2>/dev/null; then
        violation "$rel is a generated symlink but not gitignored (run sync.sh)"
      fi
    done
  done
fi

echo ""
if [ "$CHECK_MODE" = true ]; then
  if [ "$VIOLATIONS" -gt 0 ]; then
    echo -e "${RED}✗ Skill layout drift: $VIOLATIONS violation(s)${NC}"
    exit 1
  fi
  echo -e "${GREEN}✅ Skill layout is consistent${NC}"
else
  if [ "$VIOLATIONS" -gt 0 ]; then
    echo -e "${RED}Sync finished with $VIOLATIONS error(s) — see above${NC}"
    exit 1
  fi
  echo -e "${GREEN}✅ Skills synced!${NC}"
  echo -e "- ${YELLOW}Note:${NC} install external skills with: npx skills add <owner>/<repo> --agent universal"
fi
