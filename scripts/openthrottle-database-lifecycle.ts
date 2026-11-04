#!/usr/bin/env node
/**
 * @description `pnpm run database:start` / `database:stop`, worktree-aware.
 *
 * The primary checkout (no `OT_WORKTREE_DB` marker) and `OT_WORKTREE_DB=isolated`
 * run EXACTLY the commands the package.json scripts used to inline —
 * `docker compose up -d redis postgres` / `docker compose down --remove-orphans`
 * — streamed straight to the terminal. An isolated worktree's `.env` (written by
 * `pnpm worktree:db isolate`) carries its own POSTGRES_PORT/REDIS_PORT and a
 * per-worktree COMPOSE_PROJECT_NAME, so those same commands start and stop its
 * OWN containers (stop keeps the volumes; `worktree:remove` deletes them).
 *
 * A `shared` worktree never owns a database:
 *  - start: if the primary's Postgres/Redis answer on POSTGRES_PORT/REDIS_PORT it
 *    is a no-op; otherwise the PRIMARY's containers are started on its behalf with
 *    the primary's compose file, project and volumes (never this worktree's own
 *    compose file, which may have drifted on the branch, and never a container
 *    under the worktree's compose project).
 *  - stop: never stops the shared database.
 *
 * Reads the marker and ports from the process env, then this checkout's root
 * `.env` — read directly, never loaded into the child's environment, so the
 * compose commands see exactly the environment they always did. Runs under bare
 * Node (native type stripping), dependency-free.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { createConnection } from 'node:net';
import { basename, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { readEnvFile } from './utils/env.ts';
import { primaryCheckoutDir } from './utils/git.ts';
import { createLogger } from './utils/logger.ts';
import type { WorktreeDbMode } from './utils/worktree-db.ts';
import { resolveWorktreeDbMode, WORKTREE_DB_ENV_KEY } from './utils/worktree-db.ts'; // prettier-ignore

const logger = createLogger();

export type DatabaseAction = 'start' | 'stop';

/** What a database action turns into. Pure data, so the decision is unit-testable. */
export type DatabasePlan =
  /** Run `docker compose <args>` in this checkout, as the inline scripts always did. */
  | { readonly args: readonly string[]; readonly kind: 'own-compose' }
  /** Shared database already answers: print where, change nothing. */
  | { readonly kind: 'shared-reachable' }
  /** Shared database is down: start the PRIMARY's containers on its behalf. */
  | { readonly kind: 'shared-start-primary' }
  /** Never stop the shared database. */
  | { readonly kind: 'shared-stop-skipped' };

/** The compose arguments the primary / isolated checkout always ran. */
export const OWN_COMPOSE_ARGS: Record<DatabaseAction, readonly string[]> = {
  start: ['compose', 'up', '-d', 'redis', 'postgres'],
  stop: ['compose', 'down', '--remove-orphans'],
};

const DEFAULT_POSTGRES_PORT = 6010;
const DEFAULT_REDIS_PORT = 6011;

/** What `planDatabaseAction` needs to know about the world. */
export interface DatabasePlanInput {
  readonly action: DatabaseAction;
  readonly mode: WorktreeDbMode;
  /** Both shared services accepted a connection (only meaningful for `shared` + `start`). */
  readonly sharedReachable: boolean;
}

/**
 * Decide what to do. `primary` and `isolated` own their containers (an isolated
 * worktree under its own ports and compose project, see `worktree:db isolate`);
 * `shared` never owns one.
 */
export const planDatabaseAction = (input: DatabasePlanInput): DatabasePlan => {
  if (input.mode !== 'shared') {
    return { args: OWN_COMPOSE_ARGS[input.action], kind: 'own-compose' };
  }

  if (input.action === 'stop') {
    return { kind: 'shared-stop-skipped' };
  }

  return input.sharedReachable
    ? { kind: 'shared-reachable' }
    : { kind: 'shared-start-primary' };
};

/** Compose's project-name normalization: lowercase, only `[a-z0-9_-]`. */
const normalizeProjectName = (name: string): string =>
  name.toLowerCase().replace(/[^a-z0-9_-]/g, '');

/**
 * The primary's compose project, resolved the way compose does for a
 * `--project-directory` run: the primary's own `COMPOSE_PROJECT_NAME` (its
 * `.env`) wins, else the compose file's top-level `name:`, else the directory
 * name.
 */
export const resolvePrimaryComposeProject = (input: {
  readonly composeContents: string;
  readonly primaryDir: string;
  readonly primaryEnv: Readonly<Record<string, string>>;
}): string => {
  const fromEnv = input.primaryEnv.COMPOSE_PROJECT_NAME?.trim();
  const fromFile = /^name:\s*["']?([^"'#\s]+)/m.exec(input.composeContents)?.[1]; // prettier-ignore
  const normalized = normalizeProjectName(
    [fromEnv, fromFile, basename(input.primaryDir)].find(
      (candidate) => candidate !== undefined && candidate !== '',
    ) ?? '',
  );

  return normalized === '' ? 'openthrottle' : normalized;
};

/** `docker compose` arguments that start the PRIMARY's Postgres/Redis, pinned to its file, directory and project. */
export const primaryStartArgs = (
  primaryDir: string,
  project: string,
): string[] => [
  'compose',
  '-f',
  join(primaryDir, 'docker-compose.yml'),
  '--project-directory',
  primaryDir,
  '-p',
  project,
  'up',
  '-d',
  'redis',
  'postgres',
];

const parsePort = (value: string | undefined, fallback: number): number => {
  const port = Number(value);

  return Number.isInteger(port) && port > 0 && port < 65536 ? port : fallback;
};

/** True when something accepts a TCP connection on 127.0.0.1:`port` (docker publishes on loopback). */
const isReachable = (port: number, timeoutMs = 1500): Promise<boolean> =>
  new Promise((resolve) => {
    const socket = createConnection({ host: '127.0.0.1', port });
    const finish = (reachable: boolean): void => {
      socket.destroy();
      resolve(reachable);
    };

    socket.setTimeout(timeoutMs, () => finish(false));
    socket.once('connect', () => finish(true));
    socket.once('error', () => finish(false));
  });

const dockerCompose = (args: readonly string[]): number => {
  const outcome = spawnSync('docker', [...args], { stdio: 'inherit' });

  if (outcome.error) {
    logger.fail(`docker failed to start: ${outcome.error.message}`);

    return 1;
  }

  return outcome.status ?? 1;
};

/** Run one database action for the checkout at `cwd`; returns the process exit code. */
export const runDatabaseAction = async (
  action: DatabaseAction,
  cwd: string,
): Promise<number> => {
  const envFile = readEnvFile(join(cwd, '.env'));
  const mode = resolveWorktreeDbMode(
    process.env[WORKTREE_DB_ENV_KEY] ?? envFile[WORKTREE_DB_ENV_KEY],
  );

  const postgresPort = parsePort(process.env.POSTGRES_PORT ?? envFile.POSTGRES_PORT, DEFAULT_POSTGRES_PORT); // prettier-ignore
  const redisPort = parsePort(process.env.REDIS_PORT ?? envFile.REDIS_PORT, DEFAULT_REDIS_PORT); // prettier-ignore

  const sharedReachable =
    mode === 'shared' && action === 'start'
      ? (await Promise.all([isReachable(postgresPort), isReachable(redisPort)])).every(Boolean) // prettier-ignore
      : false;

  const plan = planDatabaseAction({ action, mode, sharedReachable });
  const ports = `postgres :${postgresPort} / redis :${redisPort}`;

  if (plan.kind === 'own-compose') {
    return dockerCompose(plan.args);
  }

  const primaryDir = primaryCheckoutDir(cwd);

  if (primaryDir === undefined) {
    logger.fail('OT_WORKTREE_DB=shared but the primary checkout could not be resolved (git rev-parse --git-common-dir)'); // prettier-ignore

    return 1;
  }

  if (plan.kind === 'shared-stop-skipped') {
    logger.info(`database:stop skipped: this worktree uses the shared database (${ports}) from ${primaryDir}; it is never stopped from a worktree`); // prettier-ignore

    return 0;
  }

  if (plan.kind === 'shared-reachable') {
    logger.info(`using the shared database on ${ports} from ${primaryDir}`);

    return 0;
  }

  const composeFile = join(primaryDir, 'docker-compose.yml');

  if (!existsSync(composeFile)) {
    logger.fail(`the shared database is down and ${composeFile} does not exist, so it cannot be started`); // prettier-ignore

    return 1;
  }

  const project = resolvePrimaryComposeProject({
    composeContents: readFileSync(composeFile, 'utf8'),
    primaryDir,
    primaryEnv: readEnvFile(join(primaryDir, '.env')),
  });

  logger.info(`the shared database (${ports}) is not reachable: starting the primary's containers on its behalf (project ${project}, ${primaryDir})`); // prettier-ignore

  const exitCode = dockerCompose(primaryStartArgs(primaryDir, project));

  if (exitCode === 0) {
    logger.info(`using the shared database on ${ports} from ${primaryDir}`);
  }

  return exitCode;
};

/** Narrow a CLI argument to a database action. */
export const parseDatabaseAction = (
  value: string | undefined,
): DatabaseAction | undefined =>
  value === 'start' || value === 'stop' ? value : undefined;

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const action = parseDatabaseAction(process.argv[2]);

  if (action === undefined) {
    logger.fail('usage: openthrottle-database-lifecycle.ts <start|stop>');
    process.exitCode = 2;
  } else {
    process.exitCode = await runDatabaseAction(action, process.cwd());
  }
}
