#!/usr/bin/env sh

################################################################################
#
#   🔪 Used in Vercel to skip the build when the an application is unchanged.
#
#     - https://vercel.com/docs/projects/overview#ignored-build-step
#     - Exiting with code 1 (new Build needed) or code 0 (Skip Build)
#
################################################################################


################################################################################
# 1. Skip the build if this is a dependabot PR
################################################################################
IS_DEPENDABOT_PR=("$VERCEL_GIT_COMMIT_REF" == "dependabot"*)
IS_SKIP_CI=("$VERCEL_GIT_COMMIT_MESSAGE" == *"[skip ci]"*)

if [ "$IS_DEPENDABOT_PR" = true ] || [ "$IS_SKIP_CI" = true ];
then
  echo "🛑 - Build cancelled because this is a dependabot PR"
  exit 0;
fi

################################################################################
# 2. Now we can use "nx-ignore" see if this application has changes,
################################################################################
if [ ! -z "$1" ];
then
  npx nx-ignore $1
else
  echo "🛑 - No application name provided"
  exit 0;
fi
