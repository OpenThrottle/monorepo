/**
 * @description OpenThrottle's worktree teardown hook — the mirror of
 * `scripts/setup_worktree.ts`. Discovered by the ot-worktree skill's destroy action via
 * `.worktree/teardown.sh`, and run with cwd = the worktree, immediately BEFORE the worktree is
 * removed.
 *
 * Provisioning gives a worktree its own docker compose project
 * (`COMPOSE_PROJECT_NAME=openthrottle-<slug>`, container prefix `wt-<slug>-`). Removing the
 * worktree's directory does not stop those containers — they keep running, detached from any
 * checkout, until someone notices. This brings them down.
 *
 * Nothing else needs undoing: ports are derived deterministically from the worktree name
 * (`scripts/lib/worktree-ports.ts`), not leased from a registry, so there is no allocation to
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

import { createLogger, readEnvValue, run } from './lib/index.ts';

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

/** True when a docker CLI exists AND its daemon answers — the only state in which `down` can work. */
const isDockerUsable = (): boolean =>
  run('docker', ['info'], { allowFailure: true, stdio: 'pipe' }).exitCode === 0;

const main = (): void => {
  // Stdout belongs to the skill's path contract; every diagnostic goes to stderr.
  const logger = createLogger({ stream: process.stderr });
  const worktreePath = process.env.OPENTHROTTLE_WORKTREE_PATH ?? process.cwd();

  const project = resolveWorktreeComposeProject({
    composeProjectName: readEnvValue(
      join(worktreePath, '.env'),
      'COMPOSE_PROJECT_NAME',
    ),
    hasComposeOverride: existsSync(join(worktreePath, WORKTREE_COMPOSE_FILE)),
    worktreePath,
  });

  if (project === null) {
    logger.info('teardown: no worktree compose project to stop');
    return;
  }

  if (!isDockerUsable()) {
    logger.warn(
      `teardown: docker is unavailable — not stopping compose project "${project}". Nothing is running if the daemon is down, but check with "docker ps" if it was up earlier.`,
    );
    return;
  }

  logger.info(`teardown: stopping compose project "${project}"`);

  // -p pins the project explicitly rather than trusting the ambient .env, so this can only ever
  // touch the project the guard above approved.
  const result = run(
    'docker',
    [
      'compose',
      '-p',
      project,
      '-f',
      BASE_COMPOSE_FILE,
      '-f',
      WORKTREE_COMPOSE_FILE,
      'down',
      '--remove-orphans',
    ],
    { allowFailure: true, cwd: worktreePath, stdio: 'pipe' },
  );

  if (result.exitCode !== 0) {
    logger.fail(
      `teardown: "docker compose down" failed for project "${project}" (exit ${result.exitCode}). Refusing to remove the worktree — its containers would be stranded. Stop them by hand, then retry.`,
    );
    logger.fail(result.stderr.trim());
    process.exitCode = 1;
    return;
  }

  logger.success(`teardown: stopped compose project "${project}"`);
};

// Guarded so the pure helpers above stay importable from tests without running the teardown.
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
