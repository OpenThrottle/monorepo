/**
 * @description sync-subtree — publish a monorepo subdirectory to the ROOT of
 * a standalone remote repo's branch.
 *
 * Usage:
 *   tsx scripts/sync-subtree.ts <prefix> <remote> [branch] [--force]
 *
 * Example:
 *   tsx scripts/sync-subtree.ts applications/openthrottle openthrottle main
 *   tsx scripts/sync-subtree.ts applications/openthrottle openthrottle main --force
 *
 * Why not `git subtree push`?
 * This repo's history carries stale `git-subtree-dir:` / `git-subtree-split:`
 * annotations (left over from when `applications/openthrottle/` lived at
 * `openthrottle/`). `git subtree split` trusts those markers and silently
 * stops walking early — so the split SHA never advances and pushes are
 * no-ops, even with --ignore-joins and a wiped .git/subtree-cache.
 *
 * Instead we publish the EXACT current tree of <prefix> as a single snapshot
 * commit. By default it is parented on the remote's current branch tip so the
 * push fast-forwards (non-destructive). With --force the snapshot is an
 * orphan commit that overwrites the remote branch.
 *
 * Note: only files tracked by git are published. Anything gitignored under
 * <prefix> (e.g. .env) is never pushed.
 */
import { fileURLToPath } from 'node:url';

import { createLogger, hasFlag, positionals, run } from './lib/index.ts';

const logger = createLogger();

const SOURCE_REF = 'main';

/** The snapshot commit message for a prefix at a monorepo short SHA. */
export const snapshotMessage = (prefix: string, short: string): string =>
  `chore: sync ${prefix} from monorepo\n\nSnapshot of ${prefix} at monorepo ${SOURCE_REF} ${short}.`;

const main = (): void => {
  const [prefix, remote, branchArg] = positionals();
  const branch = branchArg ?? 'main';
  const force = hasFlag('force');

  if (!prefix || !remote) {
    logger.fail('usage: sync-subtree <prefix> <remote> [branch] [--force]');
    logger.detail('e.g. sync-subtree applications/openthrottle openthrottle main'); // prettier-ignore
    process.exit(1);
  }

  const tree = run('git', ['rev-parse', `${SOURCE_REF}:${prefix}`]).stdout;
  const short = run('git', ['rev-parse', '--short', SOURCE_REF]).stdout;
  const message = snapshotMessage(prefix, short);

  if (force) {
    const commit = run('git', ['commit-tree', tree, '-m', message]).stdout;
    logger.step(`Force-pushing ${prefix} (${tree}) -> ${remote}/${branch} as orphan ${commit}`); // prettier-ignore
    run('git', ['push', '--force', remote, `${commit}:refs/heads/${branch}`], { stdio: 'inherit' }); // prettier-ignore
  } else {
    run('git', ['fetch', remote], { stdio: 'inherit' });
    const parent = run('git', ['rev-parse', `${remote}/${branch}`]).stdout;
    const commit = run('git', ['commit-tree', tree, '-p', parent, '-m', message]).stdout; // prettier-ignore
    logger.step(`Fast-forward push ${prefix} (${tree}) -> ${remote}/${branch} as ${commit} (parent ${parent})`); // prettier-ignore
    run('git', ['push', remote, `${commit}:refs/heads/${branch}`], { stdio: 'inherit' }); // prettier-ignore
  }
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
