/**
 * @description View shape kept for compatibility after workspace_local_repositories
 * was split into repositories + repository_checkouts (databases/openthrottle/migrations/078).
 * `id` is the checkout id; git fields come from the linked repository row.
 *
 * @deprecated Use Repository / RepositoryCheckout from modules/repositories.
 */

import type { RepositoryCheckoutKind } from '../repositories/repository-checkout.entity.ts';

export interface WorkspaceLocalRepository {
  createdAt: Date;
  displayName: string;
  filesystemPath: string;
  /** Branch the checkout is on per its last inspection; null until scanned. */
  gitCurrentBranch: string | null;
  gitDefaultBranch: string | null;
  gitRemoteUrl: string | null;
  id: string;
  /** `primary` (the repository's main clone) or `worktree` (a linked worktree). */
  kind: RepositoryCheckoutKind;
  projectId: string | null;
  updatedAt: Date;
  userId: string;
}

/**
 * @deprecated Use RepositoryData / RepositoryCheckoutData from modules/repositories.
 */
export interface WorkspaceLocalRepositoryData {
  readonly displayName: string;
  readonly filesystemPath: string;
  readonly gitDefaultBranch: string | null;
  readonly gitRemoteUrl: string | null;
  readonly id: string;
  readonly projectId: string | null;
  readonly userId: string;
}
