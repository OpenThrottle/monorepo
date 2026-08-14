#!/usr/bin/env sh
set -e

# Skip the script if we are in a linked Git worktree
source scripts/_worktree.sh
skipIfInWorktree "software installation"

# Load our environment variables
source .env

promptInstalled () {
  echo "💿 \"$1\" is installed."
}

promptSkipped () {
  echo "⏭️  Skipping \"$1\"."
}

promptUpdated () {
  echo "💿 \"$1\" is up to date."
}

installBrewPackage () {
  NAME="${2:-$1}"
  which $NAME > /dev/null 2>&1 && (brew upgrade --quiet $1 && promptUpdated $1) || (brew install $1 --quiet && promptInstalled $1)
}

# installMaestro () {
#   brew tap mobile-dev-inc/tap
#   brew install maestro --quiet
# }

# installPythonSoftware () {
#   source .venv/bin/activate
#   pip install mcp-server-fetch mcp-server-git --quiet
#
#   deactivate
# }

installSoftware () {
  # 📦 First we'll need our package manager PNPM
  corepack enable pnpm
  corepack prepare --activate

  # 🎒 Install the following tools via brew
  # installBrewPackage "1password-cli" "op"
  # installBrewPackage "langgraph-cli" "langgraph"
  # installBrewPackage "openjdk@17"
  # installBrewPackage "terraform"

  # Install the dependencies
  pnpm install
}

echo ""
echo "💽 setup_software.sh"
echo ""
echo "This script installs the software we need to run the monorepo and it's applications."
echo ""

installSoftware;
# installMaestro;
# installPythonSoftware;

echo ""
echo "✅ setup_software.sh"
echo ""
