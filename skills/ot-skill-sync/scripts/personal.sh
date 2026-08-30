#!/bin/bash
# ot-skill-sync — manage the personal (per-user) skill tier.
#
# Personal skills live OUTSIDE the repo (~/.openthrottle/skills by default,
# override with OPENTHROTTLE_PERSONAL_SKILLS_DIR) and are linked in by sync.sh,
# so they reach every agent CLI exactly like a committed skill while remaining
# impossible to commit. See docs/monorepo/foreign-workspace-skill-injection.md §7.
#
# Usage:
#   personal.sh new <name>       scaffold a skill, sync it, say how to invoke it
#   personal.sh list             what you have, and where each one is linked
#   personal.sh promote <name>   graduate it into the committed skills/ catalog
#   personal.sh demote <name>    the inverse, for when you promoted too early
#
# The whole point is that starting one costs a single command — a tier nobody
# can be bothered to opt into is a tier nobody uses.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/common.sh"

usage() {
  cat >&2 <<EOF
Usage: $(basename "$0") <command> [args]

  new <name>     Create <personal root>/<name>/SKILL.md from a template and sync it.
  list           List personal skills and where each is linked.
  promote <name> Move a personal skill into $SKILLS_SRC_DIR/, re-sync, and stage it.
  demote <name>  Move a committed skill back to the personal root (inverse of promote).

Personal root: $(resolve_personal_skills_root)
  (override with $PERSONAL_SKILLS_DIR_ENV)
EOF
  exit 1
}

detect_repo_root || exit 1
validate_agent_skill_dirs || exit 1

PERSONAL_ROOT="$(resolve_personal_skills_root)"

# Same rule the frontmatter schema enforces (AGENT_ASSET_SLUG_PATTERN). Checked
# here so a bad name fails before anything is written, not at ingest.
assert_valid_slug() {
  case "$1" in
    *[!a-z0-9-]* | -* | *- | *--*)
      echo -e "${RED}Error: '$1' is not a kebab-case slug (lowercase letters, digits and single hyphens).${NC}" >&2
      exit 1 ;;
  esac
  [ -n "$1" ] || usage
}

# The sync-time collision rule, applied up front. Same wording on purpose: being
# told the same thing the same way at both moments is what makes a rule legible.
assert_name_is_free() {
  local name="$1"
  if [ -f "$REPO_ROOT/$SKILLS_SRC_DIR/$name/SKILL.md" ]; then
    echo -e "${RED}✗ personal skill '$name' collides with committed $SKILLS_SRC_DIR/$name — pick another name, or edit the committed skill directly.${NC}" >&2
    exit 1
  fi
  if lockfile_skill_names | grep -qFx "$name"; then
    echo -e "${RED}✗ personal skill '$name' collides with installed '$name' in $LOCKFILE_NAME — pick another name.${NC}" >&2
    exit 1
  fi
  if [ -e "$PERSONAL_ROOT/$name" ]; then
    echo -e "${RED}Error: $PERSONAL_ROOT/$name already exists.${NC}" >&2
    exit 1
  fi
}

# Frontmatter here must satisfy skillFrontmatterSchema on the very first run —
# a scaffold that needs fixing before it validates defeats the purpose. The
# schema is strict: name (kebab-case) and description only, both non-empty.
# The description is written in our catalog's trigger-phrase style because the
# description is the only thing a model sees when deciding whether to open the
# skill, and a vague one means it never fires.
write_template() {
  local name="$1"
  mkdir -p "$PERSONAL_ROOT/$name"
  cat > "$PERSONAL_ROOT/$name/SKILL.md" <<EOF
---
name: $name
description: TODO — what this does in one clause. USE WHEN <the trigger phrases and situations that should fire it>. NOT FOR <the nearest thing it should not be confused with>.
---

# $name

TODO — the body. It costs nothing until the skill actually fires, so put the
detail here and keep the description above to trigger conditions only.

## When to use this

## Steps

1.
EOF
}

command_new() {
  [ $# -eq 1 ] || usage
  local name="$1"
  assert_valid_slug "$name"
  assert_name_is_free "$name"

  write_template "$name"
  echo -e "${GREEN}✅ Created $PERSONAL_ROOT/$name/SKILL.md${NC}"
  echo ""

  bash "$SCRIPT_DIR/sync.sh"

  echo ""
  echo -e "${GREEN}Your personal skill '$name' is live in this repo.${NC}"
  echo -e "- ${BLUE}Edit:${NC}   $PERSONAL_ROOT/$name/SKILL.md"
  echo -e "- ${BLUE}Invoke:${NC} /$name  (or let the model fire it from the description)"
  echo -e "- ${BLUE}Linked:${NC} $UNIVERSAL_DIR/$name and $AGENT_SKILL_DIRS"
  echo -e "- ${YELLOW}Not committable${NC} — when it is good, ship it with: $(basename "$0") promote $name"
}

command_list() {
  local names
  names="$(personal_skill_names "$PERSONAL_ROOT")"
  if [ -z "$names" ]; then
    echo -e "${YELLOW}No personal skills in $PERSONAL_ROOT${NC}"
    echo -e "Start one with: $(basename "$0") new <name>"
    return 0
  fi

  echo -e "${GREEN}Personal skills in $PERSONAL_ROOT${NC}"
  local name dir status
  while IFS= read -r name; do
    [ -z "$name" ] && continue
    echo ""
    echo -e "  ${BLUE}$name${NC}  →  $PERSONAL_ROOT/$name"
    for dir in $UNIVERSAL_DIR $AGENT_SKILL_DIRS; do
      if is_live_personal_link_for_list "$REPO_ROOT/$dir/$name"; then
        status="${GREEN}linked${NC}"
      elif [ -e "$REPO_ROOT/$dir/$name" ] || [ -L "$REPO_ROOT/$dir/$name" ]; then
        status="${RED}occupied by something else${NC}"
      else
        status="${YELLOW}missing — run sync.sh${NC}"
      fi
      echo -e "      $dir/$name  $status"
    done
  done <<< "$names"
}

# A link counts as linked when it RESOLVES into the personal root — fully, not
# one hop. Stage-2 fan-out links point at .agents/skills/<name>, which is itself
# the link into the personal root, so a single-hop test reports every fan-out
# entry as somebody else's file.
is_live_personal_link_for_list() {
  local link="$1"
  [ -L "$link" ] && [ -e "$link" ] || return 1
  path_is_under "$(canonical_path "$link")" "$(canonical_path "$PERSONAL_ROOT")"
}

# Re-sync and re-validate after a move. The check is the point: a promote that
# leaves the layout drifting has moved the problem, not solved it.
resync_and_verify() {
  bash "$SCRIPT_DIR/sync.sh"
  echo ""
  if ! bash "$SCRIPT_DIR/sync.sh" --check; then
    echo -e "${RED}✗ The layout is inconsistent after the move (see above). The files were moved; fix the drift before committing.${NC}" >&2
    exit 1
  fi
}

command_promote() {
  [ $# -eq 1 ] || usage
  local name="$1"
  assert_valid_slug "$name"

  if [ ! -f "$PERSONAL_ROOT/$name/SKILL.md" ]; then
    echo -e "${RED}Error: no personal skill '$name' at $PERSONAL_ROOT/$name.${NC}" >&2
    exit 1
  fi
  if [ -e "$REPO_ROOT/$SKILLS_SRC_DIR/$name" ]; then
    echo -e "${RED}Error: $SKILLS_SRC_DIR/$name already exists — promoting would overwrite a committed skill.${NC}" >&2
    exit 1
  fi
  if lockfile_skill_names | grep -qFx "$name"; then
    echo -e "${RED}Error: '$name' is an installed skill in $LOCKFILE_NAME — rename yours before promoting.${NC}" >&2
    exit 1
  fi

  # Move, never copy: two copies of one skill is the state where they diverge.
  mv "$PERSONAL_ROOT/$name" "$REPO_ROOT/$SKILLS_SRC_DIR/$name"
  echo -e "${GREEN}✅ Moved $PERSONAL_ROOT/$name → $SKILLS_SRC_DIR/$name${NC}"
  echo ""

  resync_and_verify

  git -C "$REPO_ROOT" add "$SKILLS_SRC_DIR/$name"

  echo ""
  echo -e "${GREEN}Promoted '$name' — it is now a committed skill, staged and ready.${NC}"
  echo -e "- ${BLUE}Still to do${NC} (see $SKILLS_SRC_DIR/AGENTS.md):"
  echo -e "    • add '$name' to the OT-owned list in docs/Skills.md"
  echo -e "    • re-measure the always-on description budget in that same file"
  echo -e "    • nothing goes in $LOCKFILE_NAME — that file records npx-skills installs only"
  echo -e "- ${BLUE}Commit${NC} (commitlint has no 'skills' scope — use 'monorepo'):"
  echo -e "    git commit -m \"feat(monorepo): add the $name skill\""
  echo -e "- ${YELLOW}Changed your mind?${NC} $(basename "$0") demote $name"
}

command_demote() {
  [ $# -eq 1 ] || usage
  local name="$1"
  assert_valid_slug "$name"

  if [ ! -f "$REPO_ROOT/$SKILLS_SRC_DIR/$name/SKILL.md" ]; then
    echo -e "${RED}Error: no committed skill at $SKILLS_SRC_DIR/$name.${NC}" >&2
    exit 1
  fi
  if [ -e "$PERSONAL_ROOT/$name" ]; then
    echo -e "${RED}Error: $PERSONAL_ROOT/$name already exists — move or rename it first.${NC}" >&2
    exit 1
  fi

  # Undoing your own un-pushed promote is a convenience. Removing a skill the
  # repo has actually shipped is a deletion other people will feel, so it is not
  # something an inverse command should do quietly.
  if git -C "$REPO_ROOT" ls-tree -r --name-only HEAD -- "$SKILLS_SRC_DIR/$name" 2>/dev/null | grep -q .; then
    echo -e "${RED}Error: $SKILLS_SRC_DIR/$name is already committed. Demoting it would delete a skill the repo ships — do that deliberately with 'git rm -r $SKILLS_SRC_DIR/$name' and a commit that explains why.${NC}" >&2
    exit 1
  fi

  git -C "$REPO_ROOT" rm -r --cached --quiet "$SKILLS_SRC_DIR/$name" >/dev/null 2>&1 || true
  mkdir -p "$PERSONAL_ROOT"
  mv "$REPO_ROOT/$SKILLS_SRC_DIR/$name" "$PERSONAL_ROOT/$name"
  echo -e "${GREEN}✅ Moved $SKILLS_SRC_DIR/$name → $PERSONAL_ROOT/$name${NC}"
  echo ""

  resync_and_verify

  echo ""
  echo -e "${GREEN}Demoted '$name' — it is personal again, and uncommittable again.${NC}"
  echo -e "- ${BLUE}Edit:${NC} $PERSONAL_ROOT/$name/SKILL.md"
}

[ $# -ge 1 ] || usage
COMMAND="$1"
shift

case "$COMMAND" in
  demote) command_demote "$@" ;;
  list) command_list "$@" ;;
  new) command_new "$@" ;;
  promote) command_promote "$@" ;;
  *) usage ;;
esac
