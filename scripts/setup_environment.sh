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

function initializeScript() {
  if [ -f ".env" ];
  then
    # Ask the user to confirm deleting the .env file
    read -p "- \"$1.env\" exists, do you want to reset it? (Y/n): " confirm_reset
    confirm_reset=${confirm_reset:-Y}

    if [ "$confirm_reset" = "y" ] || [ "$confirm_reset" = "Y" ];
    then
      SHOULD_RESET=true
    fi
  fi
}

function initializeEnvFile() {
  if [ -f ".env" ] && [ $SHOULD_RESET != true ];
  then
    echo "- .env file left alone!"
  else
    if test -f ".env.default";
    then
      cp .env.default .env

      if [ "$SHOULD_RESET" = true ]; then
        echo "- .env file replaced!"
      else
        echo "- .env file created!"
      fi
    else
      echo "- .env.default file not found!"
    fi
  fi
}

PACKAGE_NAME=$(jq -r .name "$PWD/package.json" 2>/dev/null)
if [ "$PACKAGE_NAME" != "monorepo" ];
then
  echo "🔴 \"environment.sh\" must be run from the \"monorepo\" repository (package.json name must be \"monorepo\")."
  exit 1
fi

echo ""
echo "🔐 environment.sh"
echo ""
echo "This script creates a local ".env" file, resetting to our defaults if the user wants to."
echo ""

# 📁 Hold onto the starting point
DIR_START=$PWD

# 🚨 Should we reset the .env file?
SHOULD_RESET=false

# Make sure we have the root level ".env" file
initializeScript 'monorepo/';
initializeEnvFile 'monorepo/';

cd applications/

# Loop over each folder
for APPLICATION in */;
do
  # Jump into the app
  cd $APPLICATION
  SHOULD_RESET=false

  echo "\n$APPLICATION"

  # Update node version when this file is present
  initializeScript applications/$APPLICATION;
  initializeEnvFile applications/$APPLICATION;

  # printf "Progress: %s%%\r" $APPLICATION
  # echo -ne "\n$APPLICATION"
  # resultScript=$(initializeScript applications/$APPLICATION;)
  # resultEnvFile=$(initializeEnvFile applications/$APPLICATION;)

  # Back up to the "applications" directory
  cd ../
done

# And back to the root
cd "$DIR_START"

echo ""
echo "✅ environment.sh"
echo ""
