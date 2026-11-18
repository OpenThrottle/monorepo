import type { WorkspaceEditorId } from '@openthrottle/nestjs-repositories-server';

/**
 * @description Options for applying editor config to a user's checkouts.
 */
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

/**
 * @description The outcome of applying one editor's config to one checkout.
 */
export interface WorkspaceEditorConfigApplication {
  readonly editor: WorkspaceEditorId;
  readonly filesWritten: readonly string[];
  readonly filesystemPath: string;
  /** Checkout id the config was applied to (stable external contract). */
  readonly repositoryId: string;
  readonly warnings: readonly string[];
}

/**
 * @description The shape of an editor's MCP config file; only `mcpServers` is managed.
 */
export interface McpServersJson {
  readonly mcpServers?: Record<string, Record<string, unknown>>;
}

/**
 * @description Repo-relative locations OpenThrottle writes for one editor.
 */
export interface WorkspaceEditorConfigPaths {
  readonly mcpConfigRelativePath: string;
  readonly rulesDirectoryRelativePath: string;
}

/**
 * @description One skill OpenThrottle offers to a configured repository.
 */
export interface RepoSkillPathEntry {
  readonly repoRelativePath: string;
  readonly slug: string;
}
