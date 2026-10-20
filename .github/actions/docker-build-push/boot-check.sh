#!/usr/bin/env bash
# Boot a freshly built app image and prove it serves, BEFORE it is pushed.
#
#   boot-check.sh <app> <image>
#
# Building an image proves it compiles, not that it starts. Every server and
# developer image published between 2026-09-15 and this check crashed at
# startup and nothing noticed, because nothing ever ran one:
#
#   - server:    ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING (a source-first
#                workspace package under node_modules), then ERR_MODULE_NOT_FOUND
#                for a devDependency the main entry imported, then EROFS writing
#                schema.gql on a read-only root filesystem.
#   - developer: ERR_MODULE_NOT_FOUND for a runtime import declared only as a
#                devDependency.
#
# Each class needs the REAL runtime to surface: the pruned production
# node_modules, the deployed hardening, and the app actually serving a request.
# So the container runs with the same restrictions as
# infra/applications/openthrottle_hcloud/templates/docker-compose.yml.tpl
# (read-only root, uid 1000, every capability dropped, no-new-privileges), and
# the check is an HTTP response, not "the process is still up".
#
# Throwaway credentials only: everything here lives on a private docker network
# for the length of one CI job.
set -euo pipefail

APP="${1:?usage: boot-check.sh <app> <image>}"
IMAGE="${2:?usage: boot-check.sh <app> <image>}"
TIMEOUT_SECONDS="${BOOT_CHECK_TIMEOUT_SECONDS:-90}"

RUN_ID="boot-check-$$"
NETWORK="${RUN_ID}-net"
APP_CONTAINER="${RUN_ID}-app"
CONTAINERS=()

HARDENING=(
  --cap-drop ALL
  --read-only
  --security-opt no-new-privileges:true
  --tmpfs /tmp
  --user 1000:1000
)

cleanup() {
  # The +-expansion keeps an empty array safe under `set -u` on bash < 4.4.
  for container in ${CONTAINERS[@]+"${CONTAINERS[@]}"}; do
    docker rm -f "${container}" > /dev/null 2>&1 || true
  done
  docker network rm "${NETWORK}" > /dev/null 2>&1 || true
}
trap cleanup EXIT

fail() {
  echo "::error::${APP} image failed its boot check: $1"
  echo "::group::${APP} container logs"
  docker logs "${APP_CONTAINER}" 2>&1 | tail -100 || true
  echo "::endgroup::"
  exit 1
}

start() {
  local name="$1"
  shift
  CONTAINERS+=("${name}")
  docker run -d --name "${name}" --network "${NETWORK}" "$@" > /dev/null
}

# Poll a URL from INSIDE the network until it answers as wanted, or time out.
# Uses the app image's own node (distroless has no curl), so nothing is published
# on the runner's host ports.
wait_for() {
  local url="$1" want="$2"
  local probe="
    const want = process.argv[2];
    require('http').get(process.argv[1], (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        const ok = want === 'page'
          ? res.statusCode === 200
          : res.statusCode === 200 && body.includes(want);
        console.log(res.statusCode + ' ' + body.slice(0, 200));
        process.exit(ok ? 0 : 1);
      });
    }).on('error', (error) => { console.log(error.code); process.exit(1); });"
  local deadline=$((SECONDS + TIMEOUT_SECONDS))

  while ((SECONDS < deadline)); do
    if [[ "$(docker inspect -f '{{.State.Running}}' "${APP_CONTAINER}" 2> /dev/null)" != "true" ]]; then
      fail "the container exited before serving ${url}"
    fi
    if docker run --rm --network "${NETWORK}" --entrypoint /nodejs/bin/node "${IMAGE}" \
      -e "${probe}" "${url}" "${want}"; then
      echo "✅ ${APP}: ${url} served within ${TIMEOUT_SECONDS}s"
      return 0
    fi
    sleep 3
  done

  fail "${url} did not answer ${want} within ${TIMEOUT_SECONDS}s"
}

docker network create "${NETWORK}" > /dev/null

case "${APP}" in
  openthrottle-server)
    # The real dependencies, versions pinned to the Hetzner compose template.
    POSTGRES_ENV=(
      -e POSTGRES_DB=openthrottle
      -e POSTGRES_HOST=postgres
      -e POSTGRES_PASSWORD=boot-check
      -e POSTGRES_PORT=5432
      -e POSTGRES_USER=openthrottle
    )
    start "${RUN_ID}-postgres" --network-alias postgres "${POSTGRES_ENV[@]}" \
      pgvector/pgvector:0.8.2-pg18-trixie
    start "${RUN_ID}-redis" --network-alias redis redis:8.8-alpine

    deadline=$((SECONDS + TIMEOUT_SECONDS))
    until docker exec "${RUN_ID}-postgres" pg_isready -U openthrottle -d openthrottle > /dev/null 2>&1; do
      ((SECONDS < deadline)) || fail "postgres never became ready"
      sleep 2
    done

    # Migrate first, exactly as the compose stack does (the server depends on
    # migrations completing). The server does not tolerate an unmigrated
    # database: a boot-time query on a missing table is an unhandled rejection.
    # Dockerfile.Migrations is cheap, so it is built here rather than borrowed
    # from the matrix leg that publishes it. Runs from the repository root.
    docker build -q -f Dockerfile.Migrations -t "${RUN_ID}-migrations" . > /dev/null
    docker run --rm --network "${NETWORK}" "${POSTGRES_ENV[@]}" "${RUN_ID}-migrations" | tail -1
    docker rmi "${RUN_ID}-migrations" > /dev/null 2>&1 || true

    start "${APP_CONTAINER}" "${HARDENING[@]}" \
      -e API_URL=http://localhost:3000 \
      -e API_URL_EXTERNAL=http://localhost:3000 \
      -e API_URL_INTERNAL=http://localhost:3000 \
      -e APP_ENV=production \
      -e APP_URL=http://localhost:3000 \
      -e APP_URL_DEVELOPER=http://localhost:3001 \
      -e CORS_ORIGINS=http://localhost:3001 \
      -e JWT_SECRET=boot-check-not-a-secret-boot-check-not-a-secret \
      -e PORT=3000 \
      "${POSTGRES_ENV[@]}" \
      -e REDIS_HOST=redis \
      -e REDIS_PORT=6379 \
      "${IMAGE}"

    wait_for "http://${APP_CONTAINER}:3000/health" '"database":"ok"'
    ;;

  openthrottle-developer)
    # Booting loads only the SSR entry's static graph. Route-level `.server`
    # modules sit in chunks behind dynamic imports, so a missing package there
    # passes boot and fails the first time someone uses the feature (an `nx`
    # import once broke the IDE and skills routes exactly that way). So parse
    # every chunk — vm.SourceTextModule reads import specifiers without
    # evaluating anything — and resolve each one inside the image.
    resolve_check="
      import { readdirSync, readFileSync } from 'node:fs';
      import { join } from 'node:path';
      import { pathToFileURL } from 'node:url';
      import { SourceTextModule } from 'node:vm';

      const root = process.argv[1];
      const files = readdirSync(root, { recursive: true })
        .filter((file) => /\\.m?js\$/.test(file))
        .map((file) => join(root, file));
      const missing = [];
      for (const file of files) {
        const mod = new SourceTextModule(readFileSync(file, 'utf8'), { identifier: file });
        for (const { specifier } of mod.moduleRequests) {
          try {
            import.meta.resolve(specifier, pathToFileURL(file).href);
          } catch (error) {
            missing.push(specifier + '  (imported by ' + file + ': ' + error.code + ')');
          }
        }
      }
      if (missing.length > 0) {
        console.log('unresolvable imports in the SSR bundle:\\n  ' + missing.join('\\n  '));
        process.exit(1);
      }
      console.log('✅ ' + files.length + ' SSR bundle files: every static import resolves');"
    if ! docker run --rm --entrypoint /nodejs/bin/node "${IMAGE}" \
      --disable-warning=ExperimentalWarning --experimental-import-meta-resolve \
      --experimental-vm-modules --input-type=module -e "${resolve_check}" /app/build/server; then
      echo "::error::${APP} image ships SSR code importing packages its production node_modules does not contain (declared as devDependencies, or missing)."
      exit 1
    fi

    # Every variable getPublicEnv()/getServerEnv() in
    # packages/react-router-utils/src/utils/environment.ts requires — EXCEPT
    # APP_ENV, APP_NAME and APP_VERSION, which the image must carry itself
    # (Dockerfile.ReactRouter's production stage). Passing them here once hid
    # an image that crashed with "APP_VERSION is not set" on a real deploy.
    start "${APP_CONTAINER}" "${HARDENING[@]}" \
      -e API_URL_EXTERNAL=http://localhost:3000 \
      -e API_URL_INTERNAL=http://localhost:3000 \
      -e APP_NAME_SHORT=OpenThrottle \
      -e APP_URL=http://localhost:3001 \
      -e APP_URL_ADMIN=http://localhost:3002 \
      -e APP_URL_CMS=http://localhost:3003 \
      -e APP_URL_DEVELOPER=http://localhost:3001 \
      -e APP_URL_SERVER=http://localhost:3000 \
      -e APP_URL_WEBSITE=http://localhost:3004 \
      -e PORT=3000 \
      -e ROLLBAR_TOKEN=boot-check \
      "${IMAGE}"

    # /auth, not /: / only redirects, and a redirect proves the router loaded
    # but not that a route module and its imports did.
    wait_for "http://${APP_CONTAINER}:3000/auth" page
    ;;

  *)
    echo "::error::boot-check.sh has no boot profile for '${APP}'. Add one: an image that is never booted is not checked."
    exit 1
    ;;
esac
