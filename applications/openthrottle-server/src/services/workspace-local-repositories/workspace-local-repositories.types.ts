import type { RepositoryCheckoutKind } from '@openthrottle/nestjs-repositories-server';

/**
 * @description View shape kept for compatibility after workspace_local_repositories
 * was split into repositories + repository_checkouts (databases/openthrottle/migrations/078).
 * `id` is the checkout id; git fields come from the linked repository row.
 *
 * @deprecated Use Repository / RepositoryCheckout from `@openthrottle/nestjs-repositories-server`.
 */
export interface WorkspaceLocalRepository {
  readonly createdAt: Date;
  readonly displayName: string;
  readonly filesystemPath: string;
  /** Branch the checkout is on per its last inspection; null until scanned. */
  readonly gitCurrentBranch: string | null;
  readonly gitDefaultBranch: string | null;
  readonly gitRemoteUrl: string | null;
  readonly id: string;
  /** `primary` (the repository's main clone) or `worktree` (a linked worktree). */
  readonly kind: RepositoryCheckoutKind;
  readonly projectId: string | null;
  readonly updatedAt: Date;
  readonly userId: string;
}

/**
 * @deprecated Use RepositoryData / RepositoryCheckoutData from `@openthrottle/nestjs-repositories-server`.
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

/**
 * @description Input for creating a checkout through the legacy façade.
 */
export interface CreateWorkspaceLocalRepositoryData {
  readonly displayName: string;
  readonly filesystemPath: string;
  readonly gitDefaultBranch: string | null;
  readonly gitRemoteUrl: string | null;
  readonly projectId: string | null;
}

/**
 * @description Patch for a checkout through the legacy façade; absent keys are unchanged.
 */
export interface UpdateWorkspaceLocalRepositoryData {
  readonly displayName?: string;
  readonly gitDefaultBranch?: string | null;
  readonly gitRemoteUrl?: string | null;
  readonly projectId?: string | null;
}
