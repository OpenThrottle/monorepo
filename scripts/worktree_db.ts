#!/usr/bin/env node
/**
 * @description `pnpm worktree:db <command>` — database ownership for the
 * current git worktree.
 *
 *   pnpm worktree:db isolate   give this worktree its OWN Postgres/Redis
 *
 * `isolate` allocates the worktree's Postgres/Redis host ports (base+8/base+9 of
 * its port block), rewrites the root and per-app `.env` files, sets
 * `OT_WORKTREE_DB=isolated`, stops excluding postgres/redis from the compose
 * override, starts the worktree's own containers under its own compose project,
 * applies every migration (including ones only this branch has) and bootstraps
 * the default login user (developer@openthrottle.ai, admin). It never clones
 * the shared database. Re-running it on an isolated worktree changes nothing.
 * The same code path runs from `pnpm worktree:new <name> --own-db`.
 *
 * Runs under bare Node (native type stripping), dependency-free until the
 * seeding step shells out to pnpm.
 */
import { fileURLToPath } from 'node:url';

import { createLogger } from './utils/logger.ts';
import { WORKTREE_DB_ENV_KEY } from './utils/worktree-db.ts';
import { configureIsolatedDb, seedIsolatedDatabase } from './utils/worktree-db-isolate.ts'; // prettier-ignore

const logger = createLogger();

/** The commands this script understands. */
export const COMMANDS = ['isolate'] as const;

/** Run `isolate` for the worktree at `root`; returns the process exit code. */
export const isolate = (root: string): number => {
  const result = configureIsolatedDb(root);

  if (result.kind === 'refused') {
    logger.fail(result.message);

    return 1;
  }

  if (result.kind === 'already-isolated') {
    logger.success(`already isolated (postgres :${result.ports.postgres}, redis :${result.ports.redis}); nothing changed`); // prettier-ignore

    return 0;
  }

  logger.step(`${WORKTREE_DB_ENV_KEY}=isolated; postgres :${result.ports.postgres}, redis :${result.ports.redis} (port block ${result.base}); rewrote:`); // prettier-ignore

  for (const file of result.files) {
    logger.detail(file);
  }

  const failure = seedIsolatedDatabase(root, result.ports);

  if (failure !== undefined) {
    logger.fail(failure);

    return 1;
  }

  logger.success(`this worktree now owns its database (postgres :${result.ports.postgres}, redis :${result.ports.redis}), migrated and seeded with developer@openthrottle.ai`); // prettier-ignore
  logger.info('`pnpm worktree:remove` stops and removes its containers and volumes; `pnpm run database:stop` stops them and keeps the data.'); // prettier-ignore

  return 0;
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const command = process.argv[2];

  if (command === 'isolate') {
    process.exitCode = isolate(process.cwd());
  } else {
    logger.fail(`usage: pnpm worktree:db <${COMMANDS.join('|')}>`);
    process.exitCode = 2;
  }
}
