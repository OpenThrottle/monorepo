/**
 * @description Shape of the inspection snapshot cached on
 * repository_checkouts.inspection. Disk is the source of truth — this is a
 * refreshable cache keyed by scannedAt (design doc §2/§5). Read defensively:
 * older snapshots may miss fields added later.
 */

export interface RepositoryInspectionAgentConfig {
  readonly agentsMd: boolean;
  readonly claudeMd: boolean;
  readonly cursorRules: boolean;
  readonly mcpJson: boolean;
  readonly skillsDir: boolean;
}

export interface RepositoryInspectionGit {
  readonly currentBranch: string | null;
  readonly defaultBranch: string | null;
  readonly dirty: boolean | null;
  readonly isRepo: boolean;
  readonly linkedWorktrees: readonly string[];
  readonly normalizedRemoteUrl: string | null;
  readonly remotes: readonly RepositoryInspectionRemote[];
}

/** OT manifest identity anchor (.openthrottle/workspace-editors.json). */
export interface RepositoryInspectionManifest {
  readonly checkoutId: string | null;
  readonly present: boolean;
  readonly repositoryId: string | null;
}

export interface RepositoryInspectionRemote {
  readonly name: string;
  readonly url: string;
}

export interface RepositoryInspectionSnapshot {
  readonly agentConfig: RepositoryInspectionAgentConfig;
  readonly git: RepositoryInspectionGit;
  readonly manifest: RepositoryInspectionManifest;
  readonly scannedAt: string;
  readonly stack: RepositoryInspectionStack;
  readonly warnings: readonly string[];
}

export interface RepositoryInspectionStack {
  readonly languages: readonly string[];
  readonly nxWorkspace: boolean;
  readonly packageManager: string | null;
  readonly pnpmWorkspace: boolean;
  readonly turbo: boolean;
}
