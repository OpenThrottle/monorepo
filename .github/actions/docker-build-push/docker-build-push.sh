#!/usr/bin/env bash
set -euo pipefail

# Composite action helper: docker build + optional push. Inputs via INPUT_* env.

: "${INPUT_APP:?}"
: "${INPUT_GITHUB_TOKEN:?}"
: "${INPUT_PUSH:?}"
: "${INPUT_REGISTRY:?}"
: "${INPUT_TAG:?}"

ROOT="${GITHUB_WORKSPACE:-.}"
cd "${ROOT}"

DOCKERFILE="${INPUT_DOCKERFILE_PATH:-}"
if [[ -z "${DOCKERFILE}" ]]; then
  DOCKERFILE="applications/${INPUT_APP}/Dockerfile"
fi

if [[ ! -f "${DOCKERFILE}" ]]; then
  echo "::error::Dockerfile not found at ${DOCKERFILE} (app ${INPUT_APP})"
  exit 1
fi

PACKAGE_JSON="applications/${INPUT_APP}/package.json"
if [[ ! -f "${PACKAGE_JSON}" ]]; then
  echo "::error::Expected package.json at ${PACKAGE_JSON} for app ${INPUT_APP}"
  exit 1
fi

# Strip trailing slashes so image refs stay normalized.
REGISTRY="${INPUT_REGISTRY%%/}"

APP_VERSION="$(node -p "require('./${PACKAGE_JSON}').version")"
IMAGE="${REGISTRY}/${INPUT_APP}:${INPUT_TAG}"

# The canonical root Dockerfiles (Dockerfile.NestJS.v3, Dockerfile.ReactRouter.v3) are
# parameterized: APP_NAME selects which app to build, PNPM_VERSION pins the pnpm used in
# every stage, and the build stage runs `pnpm dlx nx@${NX_VERSION}`. Derive PNPM_VERSION from
# the root package.json `packageManager` field so CI and local builds stay in lockstep.
PNPM_VERSION="$(node -p "(require('./package.json').packageManager || '').replace(/^pnpm@/, '').split('+')[0]")"
if [[ -z "${PNPM_VERSION}" ]]; then
  echo "::error::Could not derive PNPM_VERSION from root package.json packageManager field"
  exit 1
fi

docker build \
  -f "${DOCKERFILE}" \
  --target production \
  --build-arg APP_NAME="${INPUT_APP}" \
  --build-arg APP_VERSION="${APP_VERSION}" \
  --build-arg GITHUB_TOKEN="${INPUT_GITHUB_TOKEN}" \
  --build-arg PNPM_VERSION="${PNPM_VERSION}" \
  --build-arg NX_VERSION="${INPUT_NX_VERSION:-}" \
  --build-arg NX_KEY="${INPUT_NX_KEY:-}" \
  -t "${IMAGE}" \
  .

echo "image=${IMAGE}" >> "${GITHUB_OUTPUT}"

PUSH_NORMALIZED="$(printf '%s' "${INPUT_PUSH}" | tr '[:upper:]' '[:lower:]')"
case "${PUSH_NORMALIZED}" in
  true)
    docker push "${IMAGE}"
    ;;
  false | '')
    ;;
  *)
    echo "::warning::Unexpected push input '${INPUT_PUSH}'; expected true or false. Skipping push."
    ;;
esac
