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

# Install a curl|shell CLI when missing. Args: display name, binary, shell (bash|sh), install URL.
installCliIfNeeded () {
  NAME="$1"
  BINARY="$2"
  INSTALLER_SHELL="$3"
  URL="$4"

  if command -v "$BINARY" > /dev/null 2>&1; then
    promptInstalled "$NAME"
    return 0
  fi

  printf '%s' "- \"$NAME\" is not installed. Install it? (Y/n): "
  read confirm_install
  confirm_install=${confirm_install:-Y}

  if [ "$confirm_install" = "y" ] || [ "$confirm_install" = "Y" ]; then
    curl -fsSL "$URL" | "$INSTALLER_SHELL"
    promptInstalled "$NAME"
  else
    promptSkipped "$NAME"
  fi
}

installMaestro () {
  brew tap mobile-dev-inc/tap
  brew install maestro --quiet
}

installPythonSoftware () {
  source .venv/bin/activate
  pip install mcp-server-fetch mcp-server-git --quiet

  deactivate
}

installSoftware () {
  # 📦 First we'll need our package manager PNPM
  corepack enable pnpm
  corepack prepare --activate

  # 🎒 Install the following tools via brew
  # installBrewPackage "1password-cli" "op"
  # installBrewPackage "langgraph-cli" "langgraph"
  # installBrewPackage "openjdk@17"
  # installBrewPackage "terraform"

  # 👨‍💻 Agent CLIs (skip if present; otherwise prompt)
  # CANONICAL SOURCE: the install URL + installer shell for each agent CLI also
  # lives on the drivers registry (packages/openthrottle-drivers, each driver's
  # `install` descriptor), which powers the in-stack /settings/setup install/update
  # feature. Keep these two in lockstep — the guard test
  # packages/openthrottle-drivers/src/drivers/__tests__/install-metadata.test.ts
  # asserts the registry matches the (name/binary/shell/URL) tuples below, so a
  # drift here or there fails CI. (Only the 5 agent CLIs are in scope; the brew
  # items above are not.)
  installCliIfNeeded "Claude" "claude" "bash" "https://claude.ai/install.sh"
  installCliIfNeeded "Cursor" "cursor-agent" "bash" "https://cursor.com/install"
  installCliIfNeeded "Codex" "codex" "sh" "https://chatgpt.com/codex/install.sh"
  installCliIfNeeded "Grok" "grok" "bash" "https://x.ai/cli/install.sh"
  installCliIfNeeded "Opencode" "opencode" "bash" "https://opencode.ai/install"

  # Install the dependencies
  pnpm install
}

echo ""
echo "🤖 software.sh"
echo ""
echo "This script installs the software we need to run the monorepo and it's applications."
echo ""

installSoftware;
# installMaestro;
# installPythonSoftware;

echo ""
echo "✅ software.sh"
echo ""
