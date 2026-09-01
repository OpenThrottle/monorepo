#!/bin/bash
# ot-skill-sync — sync the current repo's skills into the standard layout.
#
# Two-stage pipeline (see common.sh for the architecture):
#   Stage 1   skills/<name>           →  .agents/skills/<name>   (symlink)
#   Stage 1b  <personal>/<name>       →  .agents/skills/<name>   (symlink)
#   Stage 2   .agents/skills/<name>   →  <agent_dir>/<name>      (symlink)
#             for each agent_dir in AGENT_SKILL_DIRS
#
# Stage 1b is the per-user personal tier (~/.openthrottle/skills by default).
# It is opt-in by presence and feeds the SAME stage 2, so a personal skill
# reaches every place a committed one does with no special-casing downstream.
#
# Ownership rule inside .agents/skills/: a REAL DIRECTORY is owned by
# `npx skills` + skills-lock.json and is never touched; a SYMLINK is ours —
# into skills/ for a committed skill, into the personal root for a personal one.
# A name collision between skills/ and the lockfile is an error, and so is one
# between the personal root and either (unless --allow-shadow is given).
#
# Usage:
#   sync.sh                  # sync the repo you're currently in
#   sync.sh --check          # validate only (no writes); exit 1 on any drift
#   sync.sh --allow-shadow   # let a personal skill deliberately shadow a
#                            # committed one of the same name
#
# There is no side-ledger: generated links are exactly the symlinks under
# .agents/skills/ and the agent fan-out dirs, and a single static .gitignore
# block keeps them out of git.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/common.sh"

CHECK_MODE=false
ALLOW_SHADOW=false
while [ $# -gt 0 ]; do
  case "$1" in
    --allow-shadow) ALLOW_SHADOW=true ;;
    --check) CHECK_MODE=true ;;
    *)
      echo "Usage: $0 [--check] [--allow-shadow]" >&2
      exit 1 ;;
  esac
  shift
done

detect_repo_root || exit 1
validate_agent_skill_dirs || exit 1

# ── The personal tier, resolved once ─────────────────────────────────────────
# Presence is the opt-in: an absent or empty root leaves every path below
# byte-identical to a repo with no personal tier at all.
PERSONAL_ROOT="$(resolve_personal_skills_root)"
PERSONAL_ROOT_CANONICAL=""
PERSONAL_NAMES=""
if [ -d "$PERSONAL_ROOT" ]; then
  PERSONAL_ROOT_CANONICAL="$(canonical_path "$PERSONAL_ROOT")"
  # A personal root inside the repo would be committable, and its links
  # indistinguishable from authored ones — the whole point is that it is not.
  if path_is_under "$PERSONAL_ROOT_CANONICAL" "$(canonical_path "$REPO_ROOT")"; then
    echo -e "${RED}Error: personal skills root '$PERSONAL_ROOT' is inside the repository. It must live outside so its skills cannot be committed — unset or repoint $PERSONAL_SKILLS_DIR_ENV.${NC}" >&2
    exit 1
  fi
  PERSONAL_NAMES="$(personal_skill_names "$PERSONAL_ROOT")"
fi

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
  # Optional tier label, appended to the created/relinked message so sync output
  # says where each link came from. Empty for committed skills, which keeps the
  # no-personal-tier output byte-identical to before this tier existed.
  local tier="${3:-}"
  local tier_suffix=""
  [ -n "$tier" ] && tier_suffix="  ($tier)"
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
    # A symlink here is always ours (installed and custom skills are both real
    # directories), so
    # a wrong target is a repairable generated link — replace it, don't skip.
    if ! rm "$target"; then
      echo -e "- ${YELLOW} Skipping $rel (could not remove mismatched symlink)${NC}"
      return 1
    fi
    if ! ln -s "$(relative_path "$target" "$source_abs")" "$target"; then
      echo -e "- ${YELLOW} Skipping $rel (could not recreate symlink)${NC}"
      return 1
    fi
    echo -e "    ${GREEN}🔗 Relinked: $rel${tier_suffix}${NC}"
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
    echo -e "    ${GREEN}✅ Linked: $rel${tier_suffix}${NC}"
    return 0
  fi
}

# True when $1 (an absolute path to a symlink under $UNIVERSAL_DIR named $2)
# resolves into the CURRENTLY-RESOLVED personal root and still names a live
# personal skill. Membership in the current root is the test, not mere
# resolvability: a link into a root the user has since repointed still resolves,
# but is no longer part of the tier and must be reaped like any stale link.
is_live_personal_link() {
  local entry="$1"
  local name="$2"
  [ -n "$PERSONAL_ROOT_CANONICAL" ] || return 1
  [ -e "$entry" ] || return 1
  name_in_list "$name" "$PERSONAL_NAMES" || return 1
  path_is_under "$(canonical_path "$entry")" "$PERSONAL_ROOT_CANONICAL"
}

if [ "$CHECK_MODE" = false ]; then
  echo -e "${GREEN}Syncing skills in: $REPO_ROOT${NC}"
  echo -e "- ${BLUE}Stage 1:${NC} $SKILLS_SRC_DIR/* → $UNIVERSAL_DIR/"
  [ -n "$PERSONAL_NAMES" ] && echo -e "- ${BLUE}Stage 1b:${NC} $PERSONAL_ROOT/* → $UNIVERSAL_DIR/  (personal, never committed)"
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

    # A deliberate --allow-shadow personal fork takes the name; stage 1b links
    # it. Decided here rather than by relinking after the fact so --check agrees
    # with what sync writes.
    if [ "$ALLOW_SHADOW" = true ] && name_in_list "$skill_name" "$PERSONAL_NAMES"; then
      [ "$CHECK_MODE" = false ] && echo -e "- ${YELLOW} Shadowed: $SKILLS_SRC_DIR/$skill_name is overridden by your personal skill (--allow-shadow)${NC}"
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

# ── Stage 1b: personal skills → the universal dir ────────────────────────────
# Same target directory, same ensure_link, so stage 2 and every downstream check
# treat a personal skill exactly like a committed one. A missing or empty root
# skips the loop entirely.

if [ -d "$PERSONAL_ROOT" ]; then
  for personal_source in "$PERSONAL_ROOT"/*; do
    [ -e "$personal_source" ] || [ -L "$personal_source" ] || continue
    skill_name=$(basename "$personal_source")

    # Not a skill is not an error — the personal root is where half-finished
    # things live, and one bad entry must not stop the rest from syncing.
    if [ ! -d "$personal_source" ]; then
      echo -e "- ${YELLOW} Skipping personal $skill_name (not a directory)${NC}"
      continue
    fi
    if [ ! -r "$personal_source/SKILL.md" ]; then
      echo -e "- ${YELLOW} Skipping personal $skill_name (no readable SKILL.md)${NC}"
      continue
    fi

    # Collision with the committed catalog is a hard error, not a silent
    # precedence decision: running a private fork of a team skill without
    # knowing it is the failure this rule exists to prevent.
    if [ "$ALLOW_SHADOW" = false ]; then
      if [ -f "$REPO_ROOT/$SKILLS_SRC_DIR/$skill_name/SKILL.md" ]; then
        violation "personal skill '$skill_name' collides with committed $SKILLS_SRC_DIR/$skill_name — rename it, or re-run with --allow-shadow to run your private fork"
        continue
      fi
      if echo "$LOCKED_NAMES" | grep -qFx "$skill_name"; then
        violation "personal skill '$skill_name' collides with installed '$skill_name' in $LOCKFILE_NAME — rename it, or re-run with --allow-shadow to run your private fork"
        continue
      fi
    fi

    ensure_link "$personal_source" "$UNIVERSAL_DIR/$skill_name" personal || true
  done
fi

# In check mode, verify every lockfile skill is materialized (invariant 2):
# a real directory, or our symlink to the same-named $SKILLS_SRC_DIR/ source.
# A symlink to any other target is a rogue install masquerading as the entry.
if [ "$CHECK_MODE" = true ] && [ -n "$LOCKED_NAMES" ]; then
  while IFS= read -r locked; do
    [ -z "$locked" ] && continue
    locked_target="$REPO_ROOT/$UNIVERSAL_DIR/$locked"
    if [ "$ALLOW_SHADOW" = true ] && is_live_personal_link "$locked_target" "$locked"; then
      continue
    fi
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
        if link_points_into_personal_root "$entry" "$PERSONAL_ROOT"; then
          violation "$UNIVERSAL_DIR/$name is a dangling PERSONAL link — the skill was deleted or renamed under $PERSONAL_ROOT (run sync.sh to reap it, or restore the source)"
        else
          violation "$UNIVERSAL_DIR/$name is a dangling generated link (run sync.sh)"
        fi
        continue
      fi
      resolved=$(canonical_path "$entry")
      case "$resolved" in
        "$(canonical_path "$REPO_ROOT")/$SKILLS_SRC_DIR/"*) : ;;
        *)
          if ! is_live_personal_link "$entry" "$name"; then
            violation "$UNIVERSAL_DIR/$name is a symlink pointing at neither $SKILLS_SRC_DIR/ nor your personal skills root ($resolved) — run sync.sh"
          fi ;;
      esac
    elif [ -d "$entry" ]; then
      # A real directory is owned by this repo either way, and sync never
      # touches it either way. The lockfile only says WHICH kind: claimed = a
      # vendored install, unclaimed = repo-authored (custom), the tier an end
      # user writes their own skills into. Neither is drift, so neither is a
      # violation — reported so the output stays self-explaining.
      if echo "$LOCKED_NAMES" | grep -qFx "$name"; then
        echo -e "- ${YELLOW} $UNIVERSAL_DIR/$name is a real directory  (vendored)${NC}"
      else
        echo -e "- ${YELLOW} $UNIVERSAL_DIR/$name is a real directory  (repo-authored)${NC}"
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

    skill_tier=""
    if is_live_personal_link "$skill_entry" "$skill_name"; then
      skill_tier="personal"
    fi

    for agent_dir in $AGENT_SKILL_DIRS; do
      ensure_link "$skill_entry" "$agent_dir/$skill_name" "$skill_tier" || true
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
      if is_live_personal_link "$entry" "$name"; then
        continue
      fi
      if [ ! -e "$entry" ] || [ ! -f "$REPO_ROOT/$SKILLS_SRC_DIR/$name/SKILL.md" ]; then
        stale_tier=""
        link_points_into_personal_root "$entry" "$PERSONAL_ROOT" && stale_tier="  (personal skill no longer at $PERSONAL_ROOT/$name)"
        rm "$entry"
        echo -e "    ${YELLOW}🗑️  Removed stale link: $UNIVERSAL_DIR/$name${stale_tier}${NC}"
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
        if link_points_into_personal_root "$entry" "$PERSONAL_ROOT"; then
          violation "$agent_dir/$name is a dangling PERSONAL link — the skill was deleted or renamed under $PERSONAL_ROOT (run sync.sh to reap it, or restore the source)"
        else
          violation "$agent_dir/$name is a dangling generated link (run sync.sh)"
        fi
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
  # git check-ignore is the only correct probe here. `test -e`/lstat-style
  # checks follow parent symlinks and pass vacuously, which is how an
  # uncommittability assertion silently stops asserting anything.
  for agent_dir in $AGENT_SKILL_DIRS $UNIVERSAL_DIR; do
    [ -d "$REPO_ROOT/$agent_dir" ] || continue
    for entry in "$REPO_ROOT/$agent_dir"/*; do
      [ -L "$entry" ] || continue
      rel="${entry#$REPO_ROOT/}"
      if ! git -C "$REPO_ROOT" check-ignore -q "$rel" 2>/dev/null; then
        if is_live_personal_link "$entry" "$(basename "$entry")"; then
          violation "$rel is a PERSONAL skill link but not gitignored — personal skills must never be committable (run sync.sh to rewrite the managed .gitignore block)"
        else
          violation "$rel is a generated symlink but not gitignored (run sync.sh)"
        fi
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
