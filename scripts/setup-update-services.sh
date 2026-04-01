#!/usr/bin/env sh
set -e

PACKAGE_NAME=$(jq -r .name "$PWD/package.json" 2>/dev/null)
if [ "$PACKAGE_NAME" != "monorepo" ];
then
  echo "🔴 \"update.sh\" must be run from the \"monorepo\" repository (package.json name must be \"monorepo\")."
  exit 1
fi

echo ""
echo "🪫 update.sh"
echo ""
echo "This script updates the services in the monorepo."
echo ""

# 📁 Hold onto the starting point
DIR_START=$PWD

# Skip any apps you might not care about or archives
IGNORED=(
  xxxxx
  yyyyy
  zzzzz
)

# Store the branch name
BRANCH=$(git symbolic-ref HEAD | sed -e 's,.*/\(.*\),\1,')

# Update this parent repo (we know it uses "main")
if [ "$BRANCH" == 'main' ];
then
  echo "💿 updating \"monorepo\""
  git pull --quiet
else
  echo "⚠️  skipping \"monorepo\" on branch \"$BRANCH\""
fi

# Our services are really just repos, jump inside
cd services

# Now we loop over all the directories (repos)
for DIRECTORY in */;
do
  # Trim the trailing slash
  SERVICE=${DIRECTORY%/}

  # Check to see if we want to skip this directory / app
  if [[ " ${IGNORED[*]} " == *"$SERVICE"* ]];
  then
    echo "👀 ignored \"$SERVICE\""
  else

    # Into the directory we go
    cd $SERVICE

    # Store the branch name
    BRANCH=$(git symbolic-ref HEAD | sed -e 's,.*/\(.*\),\1,')


    # Ensure the repo exists, otherwise log it
    if git ls-remote --exit-code > /dev/null 2>&1;
    then
      # Check for "main" or "master" and attempt a pull
      if [ "$BRANCH" == 'main' -o "$BRANCH" == 'master' ];
      then
        echo "💿 updating \"$SERVICE\""
        git pull --quiet
      else
        echo "⚠️  skipping \"$SERVICE\" on branch \"$BRANCH\""
      fi
    else
      echo "🚨  skipping \"$SERVICE\" - repo not found"
    fi

    # Back up a level
    cd ../
  fi
done

# Back up a level where we were
cd "${DIR_START}"

echo ""
echo "✅ update.sh"
echo ""
