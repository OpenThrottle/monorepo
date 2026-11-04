#!/usr/bin/env bash
#
# Nightly logical backup, shipped OFF the box.
#
# Why this exists separately from `pnpm run database:backup`: that script is
# driven by a BullMQ job that spawns `pnpm` in a workspace checkout
# (DATABASE_BACKUP_PNPM_SCRIPT, getDatabaseBackupWorkspaceRoot). A deployed box
# runs the server from a distroless image with no pnpm, no tsx and no workspace,
# so the built-in scheduled backup CANNOT run there — it is a local-workstation
# feature.
#
# Running at host level rather than in the app is also simply better for a
# backup: a broken or OOM-killed application must not stop backups from
# happening, and that is exactly when you need them.
#
# Two independent layers protect this deployment, and this script is only the
# second:
#   1. Hetzner server snapshots (`backups_enabled` on modules/hcloud_server).
#      Whole-box, coarse, and they share the server's fate for some failure
#      modes — a deleted project takes the snapshots with it.
#   2. This: a logical pg_dump shipped to storage the box does not control.
#      An on-box backup does not survive the failure mode it exists for.
#
# Output format deliberately MATCHES scripts/openthrottle-database-backup.ts —
# openthrottle-YYYYMMDD-HHMMSS.zip containing plain SQL — so a dump from either
# source restores through the identical procedure in databases/SEEDING.md.
# Retention mirrors DATABASE_BACKUP_RETENTION_COUNT (default 14) rather than
# inventing a second scheme.
#
# Usage:
#   POSTGRES_HOST=… POSTGRES_PORT=… POSTGRES_USER=… POSTGRES_PASSWORD=… \
#   POSTGRES_DB=… OT_BACKUP_REMOTE=hetzner-storage:openthrottle/backups \
#     databases/backup-offsite.sh
#
# OT_BACKUP_REMOTE is an rclone destination. rclone is used because one binary
# covers both realistic targets: Hetzner Storage Box (sftp) and any
# S3-compatible object storage. A plain local path also works, which is what
# makes the restore drill testable.
#
# Set OT_BACKUP_REMOTE='' to keep backups on-box only. That is NOT a backup and
# the script says so loudly.
#
# OT_BACKUP_PG_DUMP overrides the dump command (default `pg_dump`). Required on a
# deployed box, which has no host Postgres client — see section 1.

set -euo pipefail

: "${POSTGRES_DB:?POSTGRES_DB is required}"
: "${POSTGRES_HOST:?POSTGRES_HOST is required}"
: "${POSTGRES_PASSWORD:?POSTGRES_PASSWORD is required}"
: "${POSTGRES_PORT:?POSTGRES_PORT is required}"
: "${POSTGRES_USER:?POSTGRES_USER is required}"

readonly BACKUP_DIR="${OT_BACKUP_DIR:-/var/backups/openthrottle}"
readonly REMOTE="${OT_BACKUP_REMOTE:-}"
readonly RETENTION="${DATABASE_BACKUP_RETENTION_COUNT:-14}"
TS="$(date -u +%Y%m%d-%H%M%S)"
readonly TS
readonly SQL_PATH="${BACKUP_DIR}/openthrottle-${TS}.sql"
readonly ZIP_PATH="${BACKUP_DIR}/openthrottle-${TS}.zip"

log() { echo "[openthrottle-backup] $*"; }

mkdir -p "${BACKUP_DIR}"

################################################################################
# 1. Dump
#
# Plain SQL (not -Fc) to match the existing archive format, so both sources
# restore identically.
#
# NOTE: this dumps the LOGICAL contents, which is what protects against data
# loss. It does NOT capture the pgvector extension binaries — a restore target
# must already have pgvector available. databases/verify-restore.sh checks that.
################################################################################
# pg_dump REFUSES to dump a newer server ("aborting because of server version
# mismatch"), and a deployed box has no host Postgres client at all — the only
# PG18 binaries present are inside the postgres container. So the dump command is
# configurable, and writes to STDOUT so it works identically either way.
#
# On the box, point it at the container so the version matches by construction:
#
#   OT_BACKUP_PG_DUMP='docker compose -f /opt/openthrottle/docker-compose.yml exec -T -e PGPASSWORD postgres pg_dump'
#
# `-e PGPASSWORD` with no value forwards the host value into the container
# without it appearing in the process list or in the unit file.
read -ra PG_DUMP_CMD <<< "${OT_BACKUP_PG_DUMP:-pg_dump}"

log "dumping ${POSTGRES_USER}@${POSTGRES_HOST}:${POSTGRES_PORT}/${POSTGRES_DB}"
log "using: ${PG_DUMP_CMD[*]}"
PGPASSWORD="${POSTGRES_PASSWORD}" "${PG_DUMP_CMD[@]}" \
  --host "${POSTGRES_HOST}" \
  --port "${POSTGRES_PORT}" \
  --username "${POSTGRES_USER}" \
  --dbname "${POSTGRES_DB}" \
  --no-owner \
  --no-privileges > "${SQL_PATH}"

if [[ ! -s "${SQL_PATH}" ]]; then
  log "FATAL: pg_dump produced an empty file"
  rm -f "${SQL_PATH}"
  exit 1
fi

log "dump size: $(du -h "${SQL_PATH}" | cut -f1)"

################################################################################
# 2. Archive
#
# `zip -j` (junk paths) so the archive contains a bare .sql, matching
# openthrottle-database-backup.ts and therefore `unzip -p` in SEEDING.md.
################################################################################
zip -j -q "${ZIP_PATH}" "${SQL_PATH}"
rm -f "${SQL_PATH}"
log "archived: ${ZIP_PATH} ($(du -h "${ZIP_PATH}" | cut -f1))"

################################################################################
# 3. Ship it off the box
#
# This is the step that makes it a backup. Failure here is FATAL: a local-only
# archive is not a backup, and exiting 0 would let a monitoring check believe
# the night's backup succeeded.
################################################################################
if [[ -z "${REMOTE}" ]]; then
  log "WARNING: OT_BACKUP_REMOTE is unset — this archive exists ONLY on this box."
  log "WARNING: that does not survive the failure mode a backup exists for."
else
  if ! command -v rclone >/dev/null 2>&1; then
    log "FATAL: rclone is not installed but OT_BACKUP_REMOTE is set"
    exit 1
  fi

  log "uploading to ${REMOTE}"
  rclone copy "${ZIP_PATH}" "${REMOTE}" --no-traverse

  # Verify the remote copy EXISTS and matches, rather than trusting exit 0.
  # A silently-truncated upload is the failure this catches.
  local_size="$(wc -c < "${ZIP_PATH}" | tr -d ' ')"
  remote_size="$(rclone size "${REMOTE}/$(basename "${ZIP_PATH}")" --json 2>/dev/null | sed -n 's/.*"bytes":\([0-9]*\).*/\1/p')"

  if [[ -z "${remote_size}" ]]; then
    log "FATAL: uploaded archive not found at ${REMOTE}"
    exit 1
  fi
  if [[ "${local_size}" != "${remote_size}" ]]; then
    log "FATAL: remote size ${remote_size} != local size ${local_size} (truncated upload)"
    exit 1
  fi
  log "verified remote copy: ${remote_size} bytes"

  # Remote retention, same window as local.
  # Newest first, so anything past the retention window is the tail.
  # The timestamped filename sorts chronologically, so a reverse sort is enough.
  remote_index=0
  while IFS= read -r stale; do
    [[ -z "${stale}" ]] && continue
    remote_index=$((remote_index + 1))
    if [[ "${remote_index}" -gt "${RETENTION}" ]]; then
      log "pruning remote ${stale}"
      rclone deletefile "${REMOTE}/${stale}"
    fi
  done < <(rclone lsf "${REMOTE}" --include 'openthrottle-*.zip' 2>/dev/null | sort -r)
fi

################################################################################
# 4. Local retention — same window as scripts/openthrottle-database-backup.ts
#
# Matched on the exact openthrottle-YYYYMMDD-HHMMSS.zip pattern so nothing else
# in the directory can be deleted, mirroring that script's BACKUP_ARCHIVE_PATTERN.
################################################################################
local_index=0
while IFS= read -r stale; do
  [[ -z "${stale}" ]] && continue
  local_index=$((local_index + 1))
  if [[ "${local_index}" -gt "${RETENTION}" ]]; then
    log "pruning local ${stale}"
    rm -f "${BACKUP_DIR}/${stale}"
  fi
done < <(
  find "${BACKUP_DIR}" -maxdepth 1 -type f -name 'openthrottle-*.zip' \
    -exec basename {} \; 2>/dev/null | sort -r
)

log "backup complete: $(basename "${ZIP_PATH}")"
