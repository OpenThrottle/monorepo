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
