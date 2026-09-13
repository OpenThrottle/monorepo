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

/**
 * Why a checkout is not recording. The UI renders copy per code rather than
 * inventing its own explanation.
 */
export const HOOK_TELEMETRY_REASONS = Object.freeze({
  /**
   * An endpoint resolves but no auth token does. Reported as buffering rather
   * than recording because a server that requires authentication rejects these
   * with `Unauthorized` and the record falls back to the local buffer —
   * observed against a real cursor-agent run, where the UI would otherwise have
   * claimed "Recording" while nothing reached the database. Fails in the safe
   * direction: an open server is mislabelled, silent loss is not.
   */
  NO_AUTH_TOKEN: 'no_auth_token',
  /** Hooks would fire, but no endpoint resolves, so records buffer locally. */
  NO_ENDPOINT: 'no_endpoint',
  /** No hook config in the checkout; only OT-orchestrated runs would record. */
  NO_PRODUCER: 'no_producer',
  /** `OPENTHROTTLE_TELEMETRY_OFFLINE=1` — buffering on purpose. */
  OFFLINE_FLAG: 'offline_flag',
} as const);

/** @see RepositoryInspectionHookTelemetry */
export const HOOK_TELEMETRY_STATUSES = Object.freeze({
  /** Producers are wired and capture runs, but records buffer to disk. */
  BUFFERING: 'buffering',
  /**
   * Nothing in the checkout wires the hooks up. An OT-orchestrated run still
   * records — the driver passes `--plugin-dir` at spawn time — so this is
   * "not wired here", not "cannot record".
   */
  NOT_WIRED: 'not_wired',
  /** Buffering by explicit request rather than by misconfiguration. */
  OFFLINE: 'offline',
  /** An endpoint resolves and at least one producer is wired. */
  RECORDING: 'recording',
} as const);

/** Hook-config markers, in the order they are reported. */
export const HOOK_TELEMETRY_PRODUCER_MARKERS: ReadonlyArray<
  readonly [string, string]
> = [
  ['claude', '.claude/settings.json'],
  ['codex', '.codex/hooks'],
  ['cursor', '.cursor/hooks.json'],
];

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
