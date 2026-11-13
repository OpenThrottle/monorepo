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
 * Then re-renders an existing docker-compose.worktree.yml for that mode, so a
 * worktree built by an older generator picks up its fixes. Never creates the
 * file and never touches Docker. Finally ensures the primary checkout's codex
 * trust entry (see utils/codex-trust.ts), for worktrees made before provision did.
 *
 * Discovered and exec'd directly by ot-worktree's heal action (heal hook rung
 * 3) and run by bare Node's native type stripping — no tsx, no dependencies.
 * Runs with cwd = the worktree root.
 */
import { fileURLToPath } from 'node:url';

import { ensurePrimaryCheckoutCodexTrust } from './utils/codex-trust.ts';
import { createLogger } from './utils/logger.ts';
import { refreshWorktreeComposeOverride, WORKTREE_COMPOSE_FILE } from './utils/worktree-compose.ts'; // prettier-ignore
import { backfillWorktreeDbMarker } from './utils/worktree-db.ts';

const logger = createLogger();

const main = (): void => {
  const changed = backfillWorktreeDbMarker(process.cwd());

  if (changed.length > 0) {
    logger.info(`🌳 backfilled OT_WORKTREE_DB=shared into ${changed.length} .env file(s)`); // prettier-ignore
  }

  const compose = refreshWorktreeComposeOverride(process.cwd());

  if (compose.kind === 'rewritten') {
    logger.info(`🌳 refreshed ${WORKTREE_COMPOSE_FILE} (${compose.db} database)`); // prettier-ignore
  }

  if (compose.kind === 'failed') {
    logger.warn(`could not refresh ${WORKTREE_COMPOSE_FILE}: ${compose.message}`); // prettier-ignore
  }

  // Backfill codex trust for worktrees provisioned before setup_worktree.ts
  // learned it. A no-op once the primary checkout's entry exists.
  const trust = ensurePrimaryCheckoutCodexTrust(process.cwd(), process.env);

  if (trust !== undefined) {
    logger[trust.level](trust.message);
  }
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
