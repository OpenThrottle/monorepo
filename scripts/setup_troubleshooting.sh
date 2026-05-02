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

HAS_ANY_ISSUES=false
HAS_BREW_ISSUES=false

check_brew_package() {
  if brew ls --versions $1 > /dev/null;
  then
    if [ "$2" = true ]; then
      echo "🚨 \"$1\" is installed via brew this will \"MOST LIKELY\" cause issues with the monorepo"
      echo "  - Please uninstall it with \"brew uninstall $1\" and run the script again"

      HAS_ANY_ISSUES=true
      HAS_BREW_ISSUES=true
    else
      echo "⚠️  \"$1\" is installed via brew"
      echo "  - this \"MAY\" cause issues with the monorepo"
    fi
  else
    # The package is not installed
    echo "👌  \"$1\" is not installed via brew"
  fi
}

renderVersions() {
  echo ""
  echo "Node Version: $(node --version)"
  echo "NPM Version: $(npm --version)"
  echo "$(nx --version)"
  echo "PNPM Version: $(pnpm --version)"
  echo "Yarn Version: $(yarn --version)"
  echo ""
}

###############################################################################
#
# Checks for known edge cases
#
###############################################################################
echo ""
echo "🛟 troubleshooting.sh"
echo ""
echo "This script will check for known issues with your system that may cause issues with the monorepo \n"

###############################################################################
#
# These package should be installed per node version
#
###############################################################################
check_brew_package "node"
check_brew_package "nx" true
check_brew_package "npm"
check_brew_package "pnpm" true
check_brew_package "yarn" true

###############################################################################
#
# These package should be installed per node version
#
###############################################################################
if [ "$HAS_ANY_ISSUES" = true ];
then
  echo ""
  echo "🚨 There are issues with your system that may cause issues with the monorepo"
  echo ""
  echo "  - Please fix the issues and run the script again"
  echo "  - See the details below for more information and hopefully a fix"
  echo "  - We will be adding more checks to this script over time to help you out"
  echo ""
fi


###############################################################################
#
# Context around issues with brew installations
#
###############################################################################
if [ "$HAS_BREW_ISSUES" = true ];
then
  echo ""
  echo "🛢️  Brew Installations:"
  echo ""
  echo "We have many services running on different Node.js versions which require"
  echo "additional packages to be installed. These brew installations are likely"
  echo "causing issues with the monorepo."
  echo ""
  echo "- A possible fix is to uninstall the package with 'brew uninstall {package}' and run the script again."
  echo ""
fi

# Now we can hard exit if any errors were found
if [ "$HAS_ANY_ISSUES" = true ];
then
  exit 1
else
  echo ""
  echo "✅ troubleshooting.sh ~ no issues found!"
  echo ""

  exit 0
fi
