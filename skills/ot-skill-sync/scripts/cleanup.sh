#!/bin/bash
# ot-skill-sync — remove everything sync.sh generated in the current repo.
#
# Generated links are exactly the symlinks under .agents/skills/ and the agent
# fan-out dirs; real directories there are owned by the repo (a vendored
# install or a repo-authored custom skill) and are left alone.
# This removes those symlinks (never their targets), strips our .gitignore block,
# deletes any legacy .gitignore-symlinks ledger, and prunes emptied roots.
#
# Personal-tier links (docs/monorepo/foreign-workspace-skill-injection.md §7) are
# symlinks like any other and are removed by the same pass — no separate personal
# teardown exists or is needed. `rm` on a symlink unlinks it, so the skill itself,
# which lives outside the repo, is never touched. The pass is reported by tier so
# it is obvious that removing links is not removing anybody's work.
#
# Usage: cleanup.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/common.sh"

detect_repo_root || exit 1
validate_agent_skill_dirs || exit 1

# Classification only — never dereferenced, so a personal root that no longer
# exists is fine (its links are dangling and get removed either way).
PERSONAL_ROOT="$(resolve_personal_skills_root)"

echo -e "${YELLOW}Cleaning up generated skill links in: $REPO_ROOT${NC}"
echo ""

removed=0

# Remove every generated symlink under the universal dir and each agent dir.
# Symlinks only — real directories (vendored installs and repo-authored custom
# skills alike) are never touched.
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
    tier=""
    link_points_into_personal_root "$entry" "$PERSONAL_ROOT" && tier="  (personal — the skill itself is untouched)"
    rm "$entry"
    removed=$((removed + 1))
    echo -e "  ${GREEN}🗑️  Removed: $dir/$(basename "$entry")${tier}${NC}"
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
# legacy .cursor leftover root), then each root's parent — a fan-out target like
# .gemini/skills creates a .gemini/ that exists only for us, whereas .claude/ and
# .cursor/ hold other config and are left alone because they are not empty.
# rmdir removes only the exact directory and only when it is empty — never a
# recursive sweep, and never .agents/skills, which may still hold committed
# external installs. Empty-only is the point: the recursive-remove variant
# throws on a directory and silently leaves it behind, which is exactly how the
# injection teardown path once accumulated orphaned dirs.
for dir in $AGENT_SKILL_DIRS .cursor; do
  rmdir "$REPO_ROOT/$dir" 2>/dev/null || true
  parent=$(dirname "$dir")
  [ "$parent" = "." ] || rmdir "$REPO_ROOT/$parent" 2>/dev/null || true
done

echo ""
echo -e "${GREEN}✅ Cleanup complete!${NC} Removed $removed link(s)."
echo -e "${YELLOW}Run sync.sh for a fresh sync.${NC}"
