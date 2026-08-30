import type {
  DiscoveredWorktreeFieldsFragment,
  GetSettingsRepositoriesQuery,
  WorkspaceRepositoryFieldsFragment,
} from '~/__generated__/graphql';

/**
 * @description A single checkout as it arrives on the repositories index query.
 * Derived from the workspace-repository fragment rather than
 * `RepositoryCheckoutFieldsFragment` so the row model stays exactly in step with
 * the fields this route actually selects.
 */
export type RepositoryCheckout =
  WorkspaceRepositoryFieldsFragment['checkouts'][number];

/**
 * @description One worktree the server found on disk, registered or not.
 */
export type DiscoveredWorktree = DiscoveredWorktreeFieldsFragment;

/**
 * @description The whole worktree-scan payload: the worktrees plus the scan-level
 * facts (where it looked, what it could not read, what the cap dropped).
 */
export type DiscoveredWorktreesResult =
  GetSettingsRepositoriesQuery['discoveredWorktrees'];

/**
 * @description One table row = one thing on disk, carrying enough of its parent
 * repository for the cell renderers. Parent rows are `kind: 'primary'` checkouts
 * and hold their repository's worktrees in `children`; child rows carry no
 * `children` of their own (the tree is exactly two levels deep).
 *
 * A row can exist WITHOUT a `repository_checkouts` row: a worktree found on disk
 * that OpenThrottle never registered is still shown, so `checkout` is nullable and
 * `id` — not `checkout.id` — is the table's row identity.
 */
export interface RepositoryCheckoutRow {
  /**
   * Activity of the worktree at this path, or null for a row that is not a
   * discovered worktree (a primary checkout, or a registered worktree that is no
   * longer on disk).
   */
  activity: DiscoveredWorktree['activity'] | null;
  branch: string | null;
  /** The registered checkout, or null for a worktree found on disk but never registered. */
  checkout: RepositoryCheckout | null;
  children?: RepositoryCheckoutRow[];
  /** Label for the row: the checkout's display name, or the worktree's directory name. */
  displayName: string;
  /**
   * Repository-level rollup of the per-checkout foreign-skill-injection opt-in.
   * `updateRepository` flips every one of the user's checkouts for a repository
   * together, so parent and child rows deliberately read the same value.
   */
  foreignSkillInjectionEnabled: boolean;
  /** Stable row identity: the checkout id, or `worktree:<path>` when unregistered. */
  id: string;
  isWorktree: boolean;
  /**
   * The registered folder is not a git checkout at all. Reported per repository by
   * discovery, so it belongs on the row rather than in a page-level list.
   */
  notAGitRepository: boolean;
  /** Absolute on-disk path (server host). */
  path: string;
  /**
   * The plan whose run is executing here; only set when `activity` is RUNNING. The
   * table links to the plan because there is no plan-run detail route.
   */
  planId: string | null;
  /** The live run executing here; only set when `activity` is RUNNING. */
  planRunId: string | null;
  remoteUrl: string | null;
  /** Null for a discovered worktree whose owning repository is not registered. */
  repositoryId: string | null;
  repositoryName: string;
  /** True when there is no `repository_checkouts` row at this path. */
  unregistered: boolean;
  updatedAt: string | null;
}
