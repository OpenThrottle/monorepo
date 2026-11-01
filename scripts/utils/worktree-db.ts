/**
 * @description The `OT_WORKTREE_DB` marker: the ONE runtime signal for "which
 * database does this checkout use". Absent = the primary checkout (it owns its
 * Postgres/Redis). `shared` = a provisioned linked worktree that uses the
 * primary's database. `isolated` = a worktree that owns its own database (the
 * isolate command flips it). Git detection of "is this a linked worktree" stays
 * ONLY in heal/provision, which decide whether to write the marker; everything
 * at runtime (database scripts, the server's scheduled-jobs gate) reads it.
 *
 * Dependency-free (node builtins + ./env.ts only): provisioning and heal run
 * under bare Node before `pnpm install`.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { firstEnvMatch, readEnvFile, upsertEnvLine } from './env.ts';

/** The env key carrying the marker. */
export const WORKTREE_DB_ENV_KEY = 'OT_WORKTREE_DB';

/** Worktree-relative .env files the marker lives in: the root one and the server's. */
export const WORKTREE_DB_ENV_FILES: readonly string[] = [
  '.env',
  'applications/openthrottle-server/.env',
];

/**
 * How a checkout relates to the database. `primary` is "marker absent" (and is
 * what an unrecognised value degrades to, so it owns its containers rather than
 * silently leaning on someone else's).
 */
export type WorktreeDbMode = 'isolated' | 'primary' | 'shared';

/** Marker values that are written to disk (`primary` is the absence of a marker). */
export type WorktreeDbMarker = Exclude<WorktreeDbMode, 'primary'>;

/** Resolve the raw marker value (trimmed, quote-stripped, case-insensitive) to a mode. */
export const resolveWorktreeDbMode = (
  value: string | undefined,
): WorktreeDbMode => {
  const normalized = value?.trim().replace(/^(["'])(.*)\1$/, '$2').toLowerCase(); // prettier-ignore

  if (normalized === 'shared' || normalized === 'isolated') {
    return normalized;
  }

  return 'primary';
};

/** The mode from a process environment (the server reads this; scripts add the .env file). */
export const worktreeDbModeFromEnv = (
  env: Readonly<Record<string, string | undefined>>,
): WorktreeDbMode => resolveWorktreeDbMode(env[WORKTREE_DB_ENV_KEY]);

/**
 * The mode for the checkout at `root`: the process environment first (an
 * `--env-file` or an explicit override), then the root `.env`. Used by scripts
 * that must not depend on how they were launched.
 */
export const readWorktreeDbMode = (
  root: string,
  env: Readonly<Record<string, string | undefined>> = process.env,
): WorktreeDbMode =>
  resolveWorktreeDbMode(
    env[WORKTREE_DB_ENV_KEY] ??
      readEnvFile(join(root, '.env'))[WORKTREE_DB_ENV_KEY],
  );

/** `.env` files under `root` that actually exist. */
const existingEnvFiles = (root: string): string[] =>
  WORKTREE_DB_ENV_FILES.map((relative) => join(root, relative)).filter((path) =>
    existsSync(path),
  );

/**
 * Write `OT_WORKTREE_DB=<marker>` into the root and server .env under `root`,
 * replacing any existing value. Used by the provisioner, which resets every
 * .env first and so always wants the marker present. Returns the files written.
 */
export const writeWorktreeDbMarker = (
  root: string,
  marker: WorktreeDbMarker,
): string[] => {
  const written: string[] = [];

  for (const path of existingEnvFiles(root)) {
    writeFileSync(path, upsertEnvLine(readFileSync(path, 'utf8'), WORKTREE_DB_ENV_KEY, marker)); // prettier-ignore
    written.push(path);
  }

  return written;
};

/**
 * Heal backfill: write `OT_WORKTREE_DB=shared` into each root/server .env under
 * `root` that has no marker yet, so worktrees provisioned before the marker
 * existed pick it up on their next `dev`. An existing value (`shared` or
 * `isolated`) is never touched. Returns the files changed (empty = no-op).
 */
export const backfillWorktreeDbMarker = (root: string): string[] => {
  const changed: string[] = [];

  for (const path of existingEnvFiles(root)) {
    const contents = readFileSync(path, 'utf8');

    if (firstEnvMatch(contents, WORKTREE_DB_ENV_KEY) !== undefined) {
      continue;
    }

    writeFileSync(path, upsertEnvLine(contents, WORKTREE_DB_ENV_KEY, 'shared'));
    changed.push(path);
  }

  return changed;
};
