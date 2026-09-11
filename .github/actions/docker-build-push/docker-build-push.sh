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

# Dual-push: the primary registry plus any extras, one ref per registry, all
# from a SINGLE build. Building once and re-tagging (rather than building per
# registry) is what guarantees an identical digest everywhere — two builds of
# the same source are not bit-identical, and the provider contract depends on
# `sha-<GITHUB_SHA>` naming the same artifact on Artifact Registry and GHCR.
IMAGES=("${IMAGE}")
while IFS= read -r extra_registry; do
  # Trim surrounding whitespace; skip blanks (a YAML block scalar keeps them).
  extra_registry="${extra_registry#"${extra_registry%%[![:space:]]*}"}"
  extra_registry="${extra_registry%"${extra_registry##*[![:space:]]}"}"
  [[ -z "${extra_registry}" ]] && continue
  IMAGES+=("${extra_registry%%/}/${INPUT_APP}:${INPUT_TAG}")
done <<< "${INPUT_REGISTRIES_ADDITIONAL:-}"

# The canonical root Dockerfiles (Dockerfile.NestJS, Dockerfile.ReactRouter) are
# parameterized: APP_NAME selects which app to build, PNPM_VERSION pins the pnpm used in
# every stage, and the build stage runs `pnpm nx`. Derive PNPM_VERSION from
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
  -t "${IMAGE}" \
  .

# Tag the built image for every additional registry (index 0 is the primary,
# already applied by `docker build -t`).
for i in "${!IMAGES[@]}"; do
  [[ "${i}" -eq 0 ]] && continue
  docker tag "${IMAGE}" "${IMAGES[${i}]}"
done

echo "image=${IMAGE}" >> "${GITHUB_OUTPUT}"
{
  echo "images<<__IMAGES_EOF__"
  printf '%s\n' "${IMAGES[@]}"
  echo "__IMAGES_EOF__"
} >> "${GITHUB_OUTPUT}"

PUSH_NORMALIZED="$(printf '%s' "${INPUT_PUSH}" | tr '[:upper:]' '[:lower:]')"
case "${PUSH_NORMALIZED}" in
  true)
    # Push every registry. `set -e` means the first failure aborts the job
    # rather than leaving a tag resolvable on one registry but not the other —
    # a half-published SHA is exactly what breaks the provider swap.
    for image in "${IMAGES[@]}"; do
      echo "::group::docker push ${image}"
      docker push "${image}"
      echo "::endgroup::"
    done
    ;;
  false | '')
    ;;
  *)
    echo "::warning::Unexpected push input '${INPUT_PUSH}'; expected true or false. Skipping push."
    ;;
esac
