import type { WorkspaceRepositoryFieldsFragment } from '~/__generated__/graphql';

/**
 * @description A single checkout as it arrives on the repositories index query.
 * Derived from the workspace-repository fragment rather than
 * `RepositoryCheckoutFieldsFragment` so the row model stays exactly in step with
 * the fields this route actually selects.
 */
export type RepositoryCheckout =
  WorkspaceRepositoryFieldsFragment['checkouts'][number];

/**
 * @description One table row = one checkout, carrying enough of its parent
 * repository for the cell renderers. Parent rows are `kind: 'primary'` checkouts
 * and hold their repository's worktree checkouts in `children`; child rows carry
 * no `children` of their own (the tree is exactly two levels deep).
 */
export interface RepositoryCheckoutRow {
  branch: string | null;
  checkout: RepositoryCheckout;
  children?: RepositoryCheckoutRow[];
  /**
   * Repository-level rollup of the per-checkout foreign-skill-injection opt-in.
   * `updateRepository` flips every one of the user's checkouts for a repository
   * together, so parent and child rows deliberately read the same value.
   */
  foreignSkillInjectionEnabled: boolean;
  isWorktree: boolean;
  remoteUrl: string | null;
  repositoryId: string;
  repositoryName: string;
}
