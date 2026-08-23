#!/bin/bash
# ot-skill-sync — remove everything sync.sh generated in the current repo.
#
# Generated links are exactly the symlinks under .agents/skills/ and the agent
# fan-out dirs; real directories there are external installs and are left alone.
# This removes those symlinks (never their targets), strips our .gitignore block,
# deletes any legacy .gitignore-symlinks ledger, and prunes emptied roots.
#
# Usage: cleanup.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/common.sh"

detect_repo_root || exit 1
validate_agent_skill_dirs || exit 1

echo -e "${YELLOW}Cleaning up generated skill links in: $REPO_ROOT${NC}"
echo ""

removed=0

# Remove every generated symlink under the universal dir and each agent dir.
# Symlinks only — real directories (external installs) are never touched.
for dir in "$UNIVERSAL_DIR" $AGENT_SKILL_DIRS; do
  root="$REPO_ROOT/$dir"
  # A symlinked root is the legacy `.claude/skills → skills` layout that sync.sh
  # replaces. Never traverse it: globbing through the link would operate on the
  # target's contents (e.g. hand-authored skills/). Remove the repo-owned link
  # itself (rm unlinks — the target is untouched) and skip traversal.
  if [ -L "$root" ]; then
    rm "$root"
    removed=$((removed + 1))
    echo -e "  ${GREEN}🗑️  Removed symlinked root: $dir${NC}"
    continue
  fi
  [ -d "$root" ] || continue
  for entry in "$root"/*; do
    [ -L "$entry" ] || continue
    rm "$entry"
    removed=$((removed + 1))
    echo -e "  ${GREEN}🗑️  Removed: $dir/$(basename "$entry")${NC}"
  done
done

# Strip our managed .gitignore block.
remove_gitignore_block

# Delete the legacy per-link ledger if a previous version left one behind.
if [ -f "$REPO_ROOT/.gitignore-symlinks" ]; then
  rm "$REPO_ROOT/.gitignore-symlinks"
  echo -e "  ${GREEN}🗑️  Removed legacy .gitignore-symlinks${NC}"
fi

# Prune the generated skill-directory roots once emptied (agent dirs and the
# legacy .cursor leftover root). rmdir removes only the exact root and only when
# it is empty — never a recursive sweep, and never .agents/skills, which may
# still hold committed external installs.
for dir in $AGENT_SKILL_DIRS .cursor; do
  rmdir "$REPO_ROOT/$dir" 2>/dev/null || true
done

echo ""
echo -e "${GREEN}✅ Cleanup complete!${NC} Removed $removed link(s)."
echo -e "${YELLOW}Run sync.sh for a fresh sync.${NC}"
