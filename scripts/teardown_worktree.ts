#!/usr/bin/env node
/**
 * @description OpenThrottle's worktree teardown hook — the mirror of
 * `scripts/setup_worktree.ts`. Discovered by the ot-worktree skill's destroy action via
 * `.worktree/teardown.sh`, and run with cwd = the worktree, immediately BEFORE the worktree is
 * removed.
 *
 * Exec'd directly by bare Node's native type stripping — no tsx. Teardown can run against a
 * half-provisioned worktree or one whose node_modules were pruned, so this script and everything
 * it imports must stay erasable-syntax TypeScript (no enums, namespaces or parameter properties)
 * that imports node builtins and scripts/utils only (the shared logger degrades gracefully without
 * chalk).
 *
 * Provisioning gives a worktree its own docker compose project
 * (`COMPOSE_PROJECT_NAME=openthrottle-<slug>`, container prefix `wt-<slug>-`). Removing the
 * worktree's directory does not stop those containers — they keep running, detached from any
 * checkout, until someone notices. This brings them down.
 *
 * An `OT_WORKTREE_DB=isolated` worktree (`pnpm worktree:db isolate` / `worktree:new --own-db`)
 * owns a Postgres/Redis in that project, so its teardown ALSO removes the project's volumes
 * (`down -v`): the data dies with the worktree. A `shared` worktree's project has no database
 * (the generated override disables it) and the shared database is never touched.
 *
 * A `shared` worktree's BullMQ queues live in the primary's Redis under the worktree's own prefix
 * (`bull:wt-<slug>`), and removing the directory would leave `bull:wt-<slug>:<Queue>:meta` keys there
 * forever. Teardown deletes exactly `bull:wt-<slug>:*` (`scripts/utils/worktree-queue-keys.ts`),
 * best-effort: Redis being down warns and moves on, it never blocks the removal.
 *
 * Nothing else needs undoing: ports are derived deterministically from the worktree name
 * (`scripts/utils/worktree-ports.ts`), not leased from a registry, so there is no allocation to
 * release. `.env` and the compose override die with the directory.
 *
 * Failure policy, per the hook contract: a non-zero exit ABORTS the removal. That is right for a
 * `docker compose down` that genuinely failed — removing anyway would strand the containers this
 * script exists to stop. It is wrong for "docker isn't installed" or "the daemon isn't running",
 * where there is provably nothing to leak, so those exit 0.
 */

import { existsSync } from 'node:fs';
import { basename, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { Logger } from './utils/index.ts';
import { createLogger, readEnvFile, readEnvValue, run } from './utils/index.ts';
import {
  resolveWorktreeDbMode,
  WORKTREE_DB_ENV_KEY,
} from './utils/worktree-db.ts';
import {
  deleteKeysMatching,
  redisConnectionFromEnv,
  resolveWorktreeQueuePrefix,
  worktreeQueueKeyPattern,
} from './utils/worktree-queue-keys.ts';

/** The compose override setup_worktree.ts generates; its presence proves this worktree was provisioned. */
const WORKTREE_COMPOSE_FILE = 'docker-compose.worktree.yml';
const BASE_COMPOSE_FILE = 'docker-compose.yml';

/** Prefix setup_worktree.ts gives every worktree compose project. */
export const WORKTREE_COMPOSE_PROJECT_PREFIX = 'openthrottle-';

/**
 * @description Decides the compose project to bring down for a worktree, or null when there is
 * nothing safe to do. Pure so the guard rails are testable without a docker daemon.
 *
 * Returns null when the worktree was never given a compose override (nothing was ever isolated), or
 * when `.env` names no project. The `openthrottle-` prefix check is a guard rail, not decoration:
 * an unprefixed or hand-edited value could name the primary checkout's project, and bringing THAT
 * down would stop the developer's main Postgres, Redis and server mid-session.
 */
export const resolveWorktreeComposeProject = (params: {
  readonly composeProjectName: string | undefined;
  readonly hasComposeOverride: boolean;
  readonly worktreePath: string;
}): string | null => {
  const { composeProjectName, hasComposeOverride, worktreePath } = params;

  if (!hasComposeOverride) return null;

  const project = composeProjectName?.trim();
  if (project === undefined || project === '') return null;
  if (!project.startsWith(WORKTREE_COMPOSE_PROJECT_PREFIX)) return null;

  // The project setup_worktree.ts would have generated for THIS directory. Anything else is a
  // hand-edit or a copied .env, and is not ours to bring down.
  const expected = `${WORKTREE_COMPOSE_PROJECT_PREFIX}${basename(
    worktreePath,
  ).toLowerCase()}`;
  return project === expected ? project : null;
};

/**
 * The `docker compose` arguments that bring a worktree's project down. Volumes are removed only for
 * an isolated worktree (it owns a database); `-p` pins the approved project explicitly.
 */
export const teardownComposeArgs = (params: {
  readonly isolated: boolean;
  readonly project: string;
}): string[] => [
  'compose',
  '-p',
  params.project,
  '-f',
  BASE_COMPOSE_FILE,
  '-f',
  WORKTREE_COMPOSE_FILE,
  'down',
  '--remove-orphans',
  ...(params.isolated ? ['--volumes'] : []),
];

/** True when a docker CLI exists AND its daemon answers — the only state in which `down` can work. */
const isDockerUsable = (): boolean =>
  run('docker', ['info'], { allowFailure: true, stdio: 'pipe' }).exitCode === 0;

/** Upper bound on the whole Redis exchange, so a wedged Redis cannot stall the removal. */
const REDIS_CLEANUP_TIMEOUT_MS = 3000;

/**
 * Deletes a shared worktree's `bull:wt-<slug>:*` keys. Never throws: every failure is one warning,
 * because stale queue keys are clutter while a blocked removal is a stuck worktree.
 */
const clearSharedQueueKeys = async (
  worktreePath: string,
  logger: Logger,
): Promise<void> => {
  let pattern: string | null = null;

  try {
    // The worktree's own env decides the prefix (server .env wins, as it does when serving) — not
    // whatever shell teardown happened to be launched from.
    const env = {
      ...readEnvFile(join(worktreePath, '.env')),
      ...readEnvFile(join(worktreePath, 'applications/openthrottle-server/.env')), // prettier-ignore
    };
    const prefix = resolveWorktreeQueuePrefix(env);
    pattern = worktreeQueueKeyPattern(prefix);

    if (pattern === null) {
      logger.warn(`teardown: queue prefix "${prefix}" is not a worktree prefix (bull:wt-*) — not touching Redis`); // prettier-ignore
      return;
    }

    const deleted = await deleteKeysMatching({
      connection: redisConnectionFromEnv(env),
      pattern,
      timeoutMs: REDIS_CLEANUP_TIMEOUT_MS,
    });
    logger.info(`teardown: deleted ${deleted} BullMQ key(s) matching "${pattern}"`); // prettier-ignore
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    logger.warn(`teardown: could not clear BullMQ keys${pattern === null ? '' : ` "${pattern}"`} (${reason}) — removing the worktree anyway`); // prettier-ignore
  }
};

/** Brings the worktree's compose project down. Returns false when it failed and removal must abort. */
const stopComposeProject = (worktreePath: string, logger: Logger): boolean => {
  const envPath = join(worktreePath, '.env');
  const isolated =
    resolveWorktreeDbMode(readEnvValue(envPath, WORKTREE_DB_ENV_KEY)) === 'isolated'; // prettier-ignore

  const project = resolveWorktreeComposeProject({
    composeProjectName: readEnvValue(envPath, 'COMPOSE_PROJECT_NAME'),
    hasComposeOverride: existsSync(join(worktreePath, WORKTREE_COMPOSE_FILE)),
    worktreePath,
  });

  if (project === null) {
    logger.info('teardown: no worktree compose project to stop');
    return true;
  }

  if (!isDockerUsable()) {
    logger.warn(
      `teardown: docker is unavailable — not stopping compose project "${project}". Nothing is running if the daemon is down, but check with "docker ps" if it was up earlier.`,
    );
    return true;
  }

  logger.info(`teardown: stopping compose project "${project}"${isolated ? ' and removing its volumes (isolated database)' : ''}`); // prettier-ignore

  // -p pins the project explicitly rather than trusting the ambient .env, so this can only ever
  // touch the project the guard above approved.
  const result = run('docker', teardownComposeArgs({ isolated, project }), {
    allowFailure: true,
    cwd: worktreePath,
    stdio: 'pipe',
  });

  if (result.exitCode !== 0) {
    logger.fail(
      `teardown: "docker compose down" failed for project "${project}" (exit ${result.exitCode}). Refusing to remove the worktree — its containers would be stranded. Stop them by hand, then retry.`,
    );
    logger.fail(result.stderr.trim());
    return false;
  }

  logger.success(`teardown: stopped compose project "${project}"`);
  return true;
};

const main = async (): Promise<void> => {
  // Stdout belongs to the skill's path contract; every diagnostic goes to stderr.
  const logger = createLogger({ stream: process.stderr });
  const worktreePath = process.env.OPENTHROTTLE_WORKTREE_PATH ?? process.cwd();

  if (!stopComposeProject(worktreePath, logger)) {
    process.exitCode = 1;
    return;
  }

  // Only a shared worktree's queues live in the primary's Redis; an isolated one's Redis dies with
  // its compose project above. Reached only when the removal is going ahead.
  const mode = resolveWorktreeDbMode(
    readEnvValue(join(worktreePath, '.env'), WORKTREE_DB_ENV_KEY),
  );
  if (mode === 'shared') {
    await clearSharedQueueKeys(worktreePath, logger);
  }
};

// Guarded so the pure helpers above stay importable from tests without running the teardown.
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await main();
}
