#!/usr/bin/env sh
set -e

# Linked worktrees use a separate admin directory (.../.git/worktrees/<name>).
# Primary checkout: --git-dir and --git-common-dir resolve to the same path.
# Skip environment setup only when cwd is a linked worktree, not the source repo.
if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  _git_dir=$(git rev-parse --git-dir)
  _git_common=$(git rev-parse --git-common-dir)
  _git_dir_abs=$(cd "$_git_dir" && pwd -P)
  _git_common_abs=$(cd "$_git_common" && pwd -P)

  if [ "$_git_dir_abs" != "$_git_common_abs" ]; then
    echo "🔷 Linked Git worktree (git-dir differs from common-dir). Skipping environment setup."
    exit 0
  fi
fi

################################################################################
#
#   Clone our repos
#
#   👀 The folder names we clone our repos into matter. The names and relative
#   paths are referenced and used for internal DNS resolution and should not
#   be changed from their default values (repo name).
#
################################################################################

PACKAGE_NAME=$(jq -r .name "$PWD/package.json" 2>/dev/null)
if [ "$PACKAGE_NAME" != "monorepo" ];
then
  echo "🔴 \"clone.sh\" must be run from the \"monorepo\" repository (package.json name must be \"monorepo\")."
  exit 1
fi

echo ""
echo "🧩 clone.sh"
echo ""
echo "This script clones the repositories into the \"services\" directory."
echo ""
echo "Note: the folder names we clone our repos into matter. The names and relative"
echo "paths are referenced and used for internal DNS resolution and should not"
echo "be changed from their default values (repo name)."
echo ""

# 📁 Hold onto the starting point
DIR_START=$PWD

cd "$DIR_START/services"

# 🌎 Repositories - https://github.com/OpenThrottle?tab=repositories&q=&type=source&language=&sort=

# TODO: We should move this behind an optional setup prompt
[ ! -d "$DIR_START/services/openclaw" ] && git clone git@github.com:openclaw/openclaw.git openclaw || echo " - openclaw"

# 👋 Archived Repositories - https://github.com/OpenThrottle?tab=repositories&q=&type=archived&language=&sort=
# [ ! -d "$DIR_START/services/learning-langchain" ] && git clone git@github.com:OpenThrottle/learning-langchain.git  || echo " - learning-langchain"

# And back to the root
cd $DIR_START

echo ""
echo "✅ clone.sh"
echo ""
