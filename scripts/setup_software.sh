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

# Load our environment variables
source .env

promptInstalled () {
  echo "💿 \"$1\" is installed."
}

promptUpdated () {
  echo "💿 \"$1\" is up to date."
}

# installPythonSoftware () {
#   source .venv/bin/activate
#   pip install mcp-server-fetch mcp-server-git --quiet
#   deactivate
# }

installBrewPackage () {
  NAME="${2:-$1}"
  which $NAME > /dev/null 2>&1 && (brew upgrade --quiet $1 && promptUpdated $1) || (brew install $1 --quiet && promptInstalled $1)
}

installMaestro () {
  brew tap mobile-dev-inc/tap
  brew install maestro --quiet
}

installSoftware () {
  # 📦 First we'll need our package manager PNPM
  # npm install -g pnpm@9.15.4 --stream=false --silent --quiet

  # FIXME: tbd...
  npm install --global pnpm@${PNPM_VERSION}
  npm install --global yarn

  # Install the correct NX version
  pnpm add --global nx@${NX_VERSION}

  # Install the following tools via pnpm
  pnpm add --global nest
  pnpm add --global schematics
  # installPnpmGlobalPackage "nest"
  # installPnpmGlobalPackage "schematics"

  # Install the following tools via brew
  installBrewPackage "1password-cli" "op"
  installBrewPackage "langgraph-cli" "langgraph"
  installBrewPackage "openjdk@17"
  installBrewPackage "terraform"

  # TEMP
  brew install anomalyco/tap/opencode
  curl -fsSL https://claude.ai/install.sh | bash

  installMaestro

  # Install the dependencies
  # pnpm install --stream=false --silent
  pnpm install
}

echo ""
echo "🤖 software.sh"
echo ""
echo "This script installs the software we need to run the monorepo and it's applications."
echo ""

installSoftware;
# installPythonSoftware;

echo ""
echo "✅ software.sh"
echo ""
