import { WorktreeRootSource } from '~/__generated__/graphql';
import { WORKTREE_DISCOVERY_COPY } from '~/routing/settings/repositories/data/data.copy';
import type { ScannedWorktreeRoot } from '~/routing/settings/repositories/data/types';

/** One configured worktree root, as a person set it, plus where the value came from. */
export interface ConfiguredWorktreeRoot {
  readonly baseRoot: string;
  /** Every rung that produced this root, in scan order, as one readable label. */
  readonly sourceLabel: string;
}

/** The short label for one rung of the server's worktree-root ladder. */
const sourceLabel = (source: WorktreeRootSource): string => {
  switch (source) {
    case WorktreeRootSource.CheckoutEnv:
      return WORKTREE_DISCOVERY_COPY.sourceLabelCheckoutEnv;
    case WorktreeRootSource.Env:
      return WORKTREE_DISCOVERY_COPY.sourceLabelEnv;
    case WorktreeRootSource.Default:
      return WORKTREE_DISCOVERY_COPY.sourceLabelDefault;
  }
};

/**
 * @description The distinct configured roots behind a scan, in the order the
 * server scanned them.
 *
 * Each scanned root is one repository's `<root>/<org>/<repo>` folder, so repositories
 * sharing a configured root collapse to one entry here. A root reached through more
 * than one rung — `.env.default` ships the same value as the built-in default — keeps
 * every source, because the path alone cannot say which one was read.
 */
export const configuredRoots = (
  scannedRoots: readonly ScannedWorktreeRoot[],
): readonly ConfiguredWorktreeRoot[] => {
  const sourcesByRoot = new Map<string, WorktreeRootSource[]>();

  for (const { baseRoot, source } of scannedRoots) {
    const sources = sourcesByRoot.get(baseRoot);
    if (sources === undefined) {
      sourcesByRoot.set(baseRoot, [source]);
    } else if (!sources.includes(source)) {
      sources.push(source);
    }
  }

  return [...sourcesByRoot].map(([baseRoot, sources]) => ({
    baseRoot,
    sourceLabel: sources.map(sourceLabel).join(', '),
  }));
};
