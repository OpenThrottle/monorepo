#!/usr/bin/env sh
set -e

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
echo "🔐 setup_environment.sh"
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

  # Back up to the "applications" directory
  cd ../
done

cd ../packages/

# Loop over each folder
for PACKAGE in */;
do
  # Jump into the app
  cd $PACKAGE
  SHOULD_RESET=false

  echo "\n$PACKAGE"

  # Update node version when this file is present
  initializeScript packages/$PACKAGE;
  initializeEnvFile packages/$PACKAGE;

  # Back up to the "packages" directory
  cd ../
done

# And back to the root
cd "$DIR_START"

echo ""
echo "✅ setup_environment.sh"
echo ""
