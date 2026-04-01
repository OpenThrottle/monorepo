#!/usr/bin/env bash
#
# Push locally built OpenThrottle app images to Google Artifact Registry using the
# same repository layout as CI (.github/workflows/openthrottle-docker.yml,
# .github/actions/docker-build-push).
#
# Prerequisites:
#   - Images exist locally (e.g. from monorepo root:
#     docker compose -f applications/openthrottle/docker-compose.yml build openthrottle-server openthrottle-developer
#     This tags the same refs as CI (applications/<app>/Dockerfile; see docker-build-push).
#     Alternative: nx run openthrottle-server:docker-build tags openthrottle-server:local — set
#     SOURCE_OPENTHROTTLE_SERVER=openthrottle-server:local or docker tag … :latest before push.
#   Default sources match compose image: lines: openthrottle-server:latest and openthrottle-developer:latest.
#   - gcloud authenticated for the target GCP project; docker credential helper:
#     gcloud auth configure-docker us-west2-docker.pkg.dev
#
# This script does NOT use GCS for Nx remote cache; it only docker-push'es to
# Artifact Registry (*.pkg.dev).
#
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT}"

# Align with openthrottle-docker.yml (ARTIFACT_REGISTRY_REGION).
readonly ARTIFACT_REGISTRY_REGION="${ARTIFACT_REGISTRY_REGION:-us-west2}"
readonly REGISTRY_HOST="${ARTIFACT_REGISTRY_REGION}-docker.pkg.dev"

# Default: staging. Production requires explicit confirmation (see below).
readonly PROJECT_ID_STAGING="${GCP_PROJECT_ID_STAGING:-openthrottle-staging}"
readonly PROJECT_ID_PRODUCTION="${GCP_PROJECT_ID_PRODUCTION:-openthrottle-production}"

# openthrottle-docker.yml: production on main uses GOOGLE_PROJECT_ID_PRODUCTION; else staging.
PRODUCTION="${PRODUCTION:-false}"

resolve_project_id() {
  local normalized
  normalized="$(printf '%s' "${PRODUCTION}" | tr '[:upper:]' '[:lower:]')"

  case "${normalized}" in
    true | 1 | yes)
      if [[ "${OPENTHROTTLE_CONFIRM_PRODUCTION:-}" != "yes" ]]; then
        echo "Refusing to push to production Artifact Registry without OPENTHROTTLE_CONFIRM_PRODUCTION=yes" >&2
        echo "Set PRODUCTION=true and OPENTHROTTLE_CONFIRM_PRODUCTION=yes only when you intend to push to ${PROJECT_ID_PRODUCTION}." >&2
        exit 1
      fi
      echo "${PROJECT_ID_PRODUCTION}"
      ;;
    false | 0 | '' | no)
      echo "${PROJECT_ID_STAGING}"
      ;;
    *)
      echo "Invalid PRODUCTION='${PRODUCTION}' (use true or false)." >&2
      exit 1
      ;;
  esac
}

# Optional: override entire registry prefix (no trailing slash), e.g. for testing.
# Default: us-west2-docker.pkg.dev/<project>/openthrottle
REGISTRY_PREFIX="${OPENTHROTTLE_REGISTRY_PREFIX:-}"

GIT_SHA_SHORT="$(git -C "${ROOT}" rev-parse --short=7 HEAD)"
# Match CI tag shape sha-<git-sha>; local uses 7-char SHA (sha-XXXXXXX).
SHA_TAG="sha-${GIT_SHA_SHORT}"

# Source images (local tags) — same names as applications/openthrottle/docker-compose.yml image: lines.
SOURCE_OPENTHROTTLE_SERVER="${SOURCE_OPENTHROTTLE_SERVER:-openthrottle-server:latest}"
SOURCE_OPENTHROTTLE_DEVELOPER="${SOURCE_OPENTHROTTLE_DEVELOPER:-openthrottle-developer:latest}"

PROJECT_ID="$(resolve_project_id)"

if [[ -z "${REGISTRY_PREFIX}" ]]; then
  REGISTRY_PREFIX="${REGISTRY_HOST}/${PROJECT_ID}/openthrottle"
fi

echo ""
echo "Artifact Registry host: ${REGISTRY_HOST}"
echo "GCP project:            ${PROJECT_ID}"
echo "Registry prefix:        ${REGISTRY_PREFIX}"
echo "Git short SHA (7):      ${GIT_SHA_SHORT}  →  tags: latest + ${SHA_TAG}"
echo "PRODUCTION:             ${PRODUCTION}"
echo ""

if [[ "${OPENTHROTTLE_DRY_RUN:-}" == "1" ]]; then
  echo "OPENTHROTTLE_DRY_RUN=1 — printing actions only."
fi

require_image() {
  local ref="$1"
  if [[ "${OPENTHROTTLE_DRY_RUN:-}" == "1" ]]; then
    return 0
  fi
  if ! docker image inspect "${ref}" >/dev/null 2>&1; then
    echo "Local image not found: ${ref}" >&2
    echo "Build from repo root, e.g.:" >&2
    echo "  docker compose -f applications/openthrottle/docker-compose.yml build openthrottle-server openthrottle-developer" >&2
    exit 1
  fi
}

run_cmd() {
  if [[ "${OPENTHROTTLE_DRY_RUN:-}" == "1" ]]; then
    printf ' %q' "$@"
    echo
  else
    "$@"
  fi
}

# Ensure docker can push to Artifact Registry.
if [[ "${OPENTHROTTLE_DRY_RUN:-}" != "1" ]]; then
  run_cmd gcloud auth configure-docker "${REGISTRY_HOST}" -q
else
  printf ' %q' gcloud auth configure-docker "${REGISTRY_HOST}" -q
  echo
fi

process_app() {
  local app_name="$1"
  local source_ref="$2"

  require_image "${source_ref}"

  local dest_base="${REGISTRY_PREFIX}/${app_name}"
  local latest_ref="${dest_base}:latest"
  local sha_ref="${dest_base}:${SHA_TAG}"

  echo "Tagging ${source_ref} → ${latest_ref} and ${sha_ref}"
  run_cmd docker tag "${source_ref}" "${latest_ref}"
  run_cmd docker tag "${source_ref}" "${sha_ref}"

  echo "Pushing ${latest_ref}"
  run_cmd docker push "${latest_ref}"

  echo "Pushing ${sha_ref}"
  run_cmd docker push "${sha_ref}"

  echo ""
}

process_app openthrottle-server "${SOURCE_OPENTHROTTLE_SERVER}"
process_app openthrottle-developer "${SOURCE_OPENTHROTTLE_DEVELOPER}"

echo "Done. Images available at ${REGISTRY_PREFIX}/<app>:latest and :${SHA_TAG}"
