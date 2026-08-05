#!/usr/bin/env sh
#
# One-shot bootstrap entrypoint: seed the default login user, then provision the
# service-account bearer credentials — in that order. Designed to run inside a
# container (see the `bootstrap` stage in Dockerfile.NestJS and the manually
# invoked `bootstrap` compose service) against the compose-network Postgres,
# with connection + token env supplied by compose. Idempotent: safe to re-run.
#
# There is intentionally NO OPENTHROTTLE_LOCAL_BOOTSTRAP gate (dropped in the
# plan decision): both underlying scripts are idempotent and provisioning is
# only ever triggered by an explicit `docker compose run --rm bootstrap`.
#
# Env:
# - POSTGRES_HOST/PORT/USER/PASSWORD/DB — target database (compose sets HOST to
#   the `postgres` service name and PORT to 5432).
# - OPENTHROTTLE_MCP_AUTH_TOKEN / OPENTHROTTLE_WORKER_GRAPHQL_AUTH_TOKEN — when
#   set, the service-account script deterministically upserts a credential that
#   matches the token; when unset it mints-and-prints (host flow).
# - OT_BOOTSTRAP_ENV_FILE — optional path to a dotenv file for host-side
#   verification (`OT_BOOTSTRAP_ENV_FILE=.env sh scripts/docker-bootstrap.sh`).
#   Unused in-container, where env arrives via compose.
set -eu

ENV_FILE_ARG=""
if [ -n "${OT_BOOTSTRAP_ENV_FILE:-}" ]; then
  ENV_FILE_ARG="--env-file=${OT_BOOTSTRAP_ENV_FILE}"
fi

echo "🔐 OpenThrottle bootstrap — default user + service accounts"

echo "→ [1/2] default login user"
pnpm exec tsx ${ENV_FILE_ARG} ./scripts/bootstrap-default-user.ts

echo "→ [2/2] service-account credentials"
pnpm exec tsx ${ENV_FILE_ARG} ./scripts/bootstrap-service-account-credentials.ts

echo "✅ bootstrap complete"
