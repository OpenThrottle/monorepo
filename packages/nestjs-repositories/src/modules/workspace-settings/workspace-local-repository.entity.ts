/**
 * @description View shape kept for compatibility after workspace_local_repositories
 * was split into repositories + repository_checkouts (databases/migrations/078).
 * `id` is the checkout id; git fields come from the linked repository row.
 *
 * @deprecated Use Repository / RepositoryCheckout from modules/repositories.
 */

export interface WorkspaceLocalRepository {
  createdAt: Date;
  displayName: string;
  filesystemPath: string;
  gitDefaultBranch: string | null;
  gitRemoteUrl: string | null;
  id: string;
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
