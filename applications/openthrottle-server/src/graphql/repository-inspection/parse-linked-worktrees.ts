/**
 * @description The ONE parser for `git worktree list --porcelain` output. Shared by the checkout
 * inspection snapshot and by worktree discovery so the two can never disagree about which paths
 * count as linked worktrees.
 */

/**
 * @description Linked-worktree paths from `git worktree list --porcelain`, main worktree excluded.
 * git always lists the main worktree first, so it is dropped; a null/empty output yields [].
 */
export const parseLinkedWorktrees = (output: string | null): string[] => {
  if (output === null) return [];
  return (
    output
      .split('\n')
      .filter((line) => line.startsWith('worktree '))
      .map((line) => line.slice('worktree '.length).trim())
      .filter((path) => path !== '')
      // git lists the main worktree first; only the linked ones matter.
      .slice(1)
  );
};
