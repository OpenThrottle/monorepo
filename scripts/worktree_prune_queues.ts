#!/usr/bin/env node
/**
 * @description `pnpm worktree:prune-queues [--apply]` — clears BullMQ keys left in the primary's
 * Redis by worktrees that no longer exist.
 *
 * A `shared` worktree runs its queues under its own prefix (`bull:wt-<slug>`), and teardown deletes
 * that prefix (`scripts/teardown_worktree.ts`). Worktrees removed before that existed — or removed
 * by a bare `git worktree remove`, which skips teardown — left theirs behind. This lists every
 * `bull:wt-<slug>` prefix in the primary's Redis that no entry in `git worktree list` claims, with
 * its key count, and deletes them only when `--apply` is passed.
 *
 *   pnpm worktree:prune-queues           dry run: list orphaned prefixes, delete nothing
 *   pnpm worktree:prune-queues --apply   delete each orphan's `bull:wt-<slug>:*` keys
 *
 * Guard rails: the bare `bull` prefix (the primary's own queues) is never a candidate, a prefix any
 * listed worktree resolves to is never a candidate, and deletion goes through the colon-anchored
 * `worktreeQueueKeyPattern`, so `bull:wt-a` can never take `bull:wt-a-b` with it. If the worktree
 * list cannot be read, nothing is touched — an empty list would make every prefix look orphaned.
 *
 * Runs under bare Node (native type stripping) with node builtins and scripts/utils only.
 */
import { basename, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { gitOutput, primaryCheckoutDir } from './utils/git.ts';
import { hasFlag, readEnvFile } from './utils/index.ts';
import { createLogger } from './utils/logger.ts';
import {
  deleteKeysMatching,
  redisConnectionFromEnv,
  resolveWorktreeQueuePrefix,
  scanKeysMatching,
  WORKTREE_QUEUE_PREFIX_ROOT,
  worktreeQueueKeyPattern,
} from './utils/worktree-queue-keys.ts';

/** Upper bound on each Redis exchange, so a wedged Redis fails the run instead of hanging it. */
const REDIS_TIMEOUT_MS = 10_000;

/** The server's env overrides the root one, as it does when serving (and in teardown). */
const SERVER_ENV_PATH = 'applications/openthrottle-server/.env';

export interface OrphanedQueuePrefix {
  readonly keyCount: number;
  readonly prefix: string;
}

/** Worktree paths from `git worktree list --porcelain` (the primary checkout included). */
export const parseWorktreeListPorcelain = (output: string): string[] =>
  output
    .split('\n')
    .filter((line) => line.startsWith('worktree '))
    .map((line) => line.slice('worktree '.length).trim())
    .filter((path) => path !== '');

/**
 * The worktree queue prefix a BullMQ key belongs to (`bull:wt-<slug>:<Queue>:meta` →
 * `bull:wt-<slug>`), or null when the key is not under a worktree prefix.
 */
export const queuePrefixOfKey = (key: string): string | null => {
  const [root, slug, rest] = key.split(':', 3);
  if (root === undefined || slug === undefined || rest === undefined) {
    return null;
  }

  const prefix = `${root}:${slug}`;
  return worktreeQueueKeyPattern(prefix) === null ? null : prefix;
};

/**
 * Every queue prefix a listed worktree could be using. Two per worktree, deliberately: the one its
 * env resolves to (what it actually runs with), and the one provisioning derives from its directory
 * name (`wt-<basename>`), so a worktree with a missing or hand-edited `.env` still protects its keys.
 * Over-protecting costs a few stale keys; under-protecting deletes a live worktree's queues.
 */
export const liveQueuePrefixes = (
  worktreePaths: readonly string[],
  readEnv: (
    worktreePath: string,
  ) => Readonly<Record<string, string | undefined>>,
): Set<string> => {
  const prefixes = new Set<string>();

  for (const worktreePath of worktreePaths) {
    prefixes.add(resolveWorktreeQueuePrefix(readEnv(worktreePath)));
    prefixes.add(`${WORKTREE_QUEUE_PREFIX_ROOT}${basename(worktreePath).toLowerCase()}`); // prettier-ignore
  }

  return prefixes;
};

/** Groups worktree keys by prefix and keeps the ones no live worktree claims, sorted by prefix. */
export const findOrphanedQueuePrefixes = (params: {
  readonly keys: readonly string[];
  readonly livePrefixes: ReadonlySet<string>;
}): OrphanedQueuePrefix[] => {
  const counts = new Map<string, number>();

  for (const key of params.keys) {
    const prefix = queuePrefixOfKey(key);
    if (prefix === null || params.livePrefixes.has(prefix)) continue;
    counts.set(prefix, (counts.get(prefix) ?? 0) + 1);
  }

  return [...counts.entries()]
    .map(([prefix, keyCount]) => ({ keyCount, prefix }))
    .sort((left, right) => left.prefix.localeCompare(right.prefix));
};

const readCheckoutEnv = (checkoutPath: string): Record<string, string> => ({
  ...readEnvFile(join(checkoutPath, '.env')),
  ...readEnvFile(join(checkoutPath, SERVER_ENV_PATH)),
});

const logger = createLogger();

/** Lists (and with `apply`, deletes) orphaned prefixes; returns the process exit code. */
export const pruneQueues = async (apply: boolean): Promise<number> => {
  const primary = primaryCheckoutDir();
  const listing = gitOutput(['worktree', 'list', '--porcelain'], primary);

  if (primary === undefined || listing === undefined) {
    logger.fail('could not read `git worktree list` — refusing to prune (every prefix would look orphaned)'); // prettier-ignore
    return 1;
  }

  const worktreePaths = parseWorktreeListPorcelain(listing);
  if (worktreePaths.length === 0) {
    logger.fail(
      '`git worktree list` returned no worktrees — refusing to prune',
    );
    return 1;
  }

  // The shared Redis is the primary's, whichever checkout this runs from.
  const connection = redisConnectionFromEnv(readCheckoutEnv(primary));
  const livePrefixes = liveQueuePrefixes(worktreePaths, readCheckoutEnv);

  let orphans: OrphanedQueuePrefix[];
  try {
    const keys = await scanKeysMatching({
      connection,
      pattern: `${WORKTREE_QUEUE_PREFIX_ROOT}*`,
      timeoutMs: REDIS_TIMEOUT_MS,
    });
    orphans = findOrphanedQueuePrefixes({ keys, livePrefixes });
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    logger.fail(`could not scan Redis at ${connection.host}:${connection.port} (${reason})`); // prettier-ignore
    return 1;
  }

  if (orphans.length === 0) {
    logger.success(`no orphaned worktree queue prefixes in Redis at ${connection.host}:${connection.port}`); // prettier-ignore
    return 0;
  }

  logger.step(`${orphans.length} orphaned worktree queue prefix(es) in Redis at ${connection.host}:${connection.port}:`); // prettier-ignore
  for (const { keyCount, prefix } of orphans) {
    logger.detail(`${prefix}  (${keyCount} key${keyCount === 1 ? '' : 's'})`);
  }

  if (!apply) {
    logger.info(
      'dry run — nothing deleted. Re-run with --apply to delete them.',
    );
    return 0;
  }

  let failed = false;
  /* eslint-disable no-await-in-loop -- one short-lived connection per prefix, one at a time */
  for (const { prefix } of orphans) {
    const pattern = worktreeQueueKeyPattern(prefix);
    if (pattern === null) continue;

    try {
      const deleted = await deleteKeysMatching({ connection, pattern, timeoutMs: REDIS_TIMEOUT_MS }); // prettier-ignore
      logger.success(`deleted ${deleted} key(s) matching "${pattern}"`);
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      logger.fail(`could not delete "${pattern}" (${reason})`);
      failed = true;
    }
  }
  /* eslint-enable no-await-in-loop */

  return failed ? 1 : 0;
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  process.exitCode = await pruneQueues(hasFlag('apply'));
}
