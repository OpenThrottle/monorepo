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
  /**
   * True when this path is itself a linked git worktree (its `.git` is a file
   * pointer, not a directory) rather than a primary checkout. Lets the
   * registration pipeline persist `kind='worktree'`. Absent on older snapshots
   * (read defensively — treat missing as false).
   */
  readonly isLinkedWorktree: boolean;
  readonly isRepo: boolean;
  readonly linkedWorktrees: readonly string[];
  readonly normalizedRemoteUrl: string | null;
  readonly remotes: readonly RepositoryInspectionRemote[];
}

/** OT manifest identity anchor (.openthrottle/workspace-editors.json). */
/**
 * Whether this checkout can actually produce skill-usage telemetry, and if not
 * why not. Answers the question that cost a debugging session on PR #522: a
 * cursor-agent run captured correctly and recorded nothing, because no endpoint
 * resolved and the records went to a local buffer instead.
 *
 * `status` is computed from two independent facts — whether any hook config is
 * wired in the checkout, and how `@openthrottle/agentic-hooks` resolves the
 * endpoint. The resolution half is IMPORTED from that package rather than
 * reimplemented, so this cannot drift from what the hooks actually do.
 *
 * Carries no secret: the endpoint URL and the auth token never cross this
 * boundary, only whether each resolved and which location supplied it.
 */
export interface RepositoryInspectionHookTelemetry {
  /** True when an auth token resolved. The token itself is never included. */
  readonly authTokenConfigured: boolean;
  /** True when an endpoint resolved. The URL itself is never included. */
  readonly endpointConfigured: boolean;
  /** Which location supplied the endpoint; `none` when none did. */
  readonly endpointSource: string;
  /** Hook configs found in the checkout, e.g. `claude`, `cursor`, `codex`. */
  readonly producers: readonly string[];
  /** Machine-readable reason for a non-recording status; null when recording. */
  readonly reason: string | null;
  /** One of HOOK_TELEMETRY_STATUSES. */
  readonly status: string;
  /** Absolute path telemetry buffers to when it cannot be sent. */
  readonly telemetryDir: string;
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
  /**
   * Undefined on snapshots written before hook-readiness was reported — this
   * is a refreshable cache, so an old row simply has no answer yet rather than
   * a wrong one. Read defensively.
   */
  readonly hookTelemetry: RepositoryInspectionHookTelemetry | undefined;
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
