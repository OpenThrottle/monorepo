import type { WorkspaceEditorId } from '../workspace-settings.types.ts';

export interface ApplyWorkspaceEditorConfigOptions {
  readonly apiBaseUrl: string;
  /**
   * Scope the apply to specific checkouts by their id. Empty/undefined applies
   * to every checkout the user owns (unchanged apply-all behavior). The field
   * name is `repositoryIds` for GraphQL-contract stability; the ids are
   * checkout ids (a checkout is the per-user on-disk instance being configured).
   */
  readonly repositoryIds?: readonly string[];
}

export interface WorkspaceEditorConfigApplication {
  readonly editor: WorkspaceEditorId;
  readonly filesWritten: readonly string[];
  readonly filesystemPath: string;
  /** Checkout id the config was applied to (stable external contract). */
  readonly repositoryId: string;
  readonly warnings: readonly string[];
}
