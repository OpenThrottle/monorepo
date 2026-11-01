#!/usr/bin/env node
/**
 * @description Repo heal hook for the ot-worktree skill: runs on every
 * `worktree:heal` (wired before each `dev`) in an already-provisioned linked
 * worktree — the skill's heal.sh only reaches it inside a linked worktree, so
 * no git detection is needed here. Backfills `OT_WORKTREE_DB=shared` into the
 * root and server .env of worktrees provisioned before the marker existed, so
 * they keep the shared-database behavior (database scripts, scheduled-jobs
 * gate). Idempotent and cheap: an existing marker is never touched.
 *
 * Discovered and exec'd directly by ot-worktree's heal action (heal hook rung
 * 3) and run by bare Node's native type stripping — no tsx, no dependencies.
 * Runs with cwd = the worktree root.
 */
import { fileURLToPath } from 'node:url';

import { createLogger } from './utils/logger.ts';
import { backfillWorktreeDbMarker } from './utils/worktree-db.ts';

const logger = createLogger();

const main = (): void => {
  const changed = backfillWorktreeDbMarker(process.cwd());

  if (changed.length > 0) {
    logger.info(`🌳 backfilled OT_WORKTREE_DB=shared into ${changed.length} .env file(s)`); // prettier-ignore
  }
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
