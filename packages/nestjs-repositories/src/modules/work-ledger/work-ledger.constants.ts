/**
 * @description Shared value sets for the work-ledger tables (databases/migrations/068).
 * `as const` objects instead of TS enums, per repo code style. Kept in sync with the
 * CHECK constraints in the migration and the type registry (slice 2).
 */

/** How a work session was closed. Mirrors chk_work_sessions_closed_by. */
export const WORK_SESSION_CLOSED_BY = {
  /** Closed by endWorkSession, or an instant session (human mutation). */
  EXPLICIT: 'explicit',
  /** Closed by the abandoned-session sweeper past the TTL (design §4.4). */
  SWEEPER: 'sweeper',
} as const;

export type WorkSessionClosedBy =
  (typeof WORK_SESSION_CLOSED_BY)[keyof typeof WORK_SESSION_CLOSED_BY];

/** Artifact verification state (claims vs facts). Mirrors chk_work_artifacts_verification. */
export const WORK_ARTIFACT_VERIFICATION = {
  /** Verifier could not reconcile the claim (e.g. rebase/branch drift). */
  ORPHANED: 'orphaned',
  /** A claim, not yet confirmed by a verifier. */
  UNVERIFIED: 'unverified',
  /** Confirmed by a verifier, or a first-party server-witnessed event born verified. */
  VERIFIED: 'verified',
} as const;

export type WorkArtifactVerification =
  (typeof WORK_ARTIFACT_VERIFICATION)[keyof typeof WORK_ARTIFACT_VERIFICATION];

/** What wrote an artifact. Mirrors chk_work_artifacts_source. */
export const WORK_ARTIFACT_SOURCE = {
  /** A verifier/scanner (e.g. git trailer harvest). */
  ADAPTER: 'adapter',
  /** Self-reported by an agent via the MCP. */
  AGENT: 'agent',
  /** Manually attached by a human. */
  HUMAN: 'human',
  /** commit_links migration backfill. */
  LEGACY: 'legacy',
  /** First-party server-witnessed event (e.g. status_change). */
  SERVER: 'server',
} as const;

export type WorkArtifactSource =
  (typeof WORK_ARTIFACT_SOURCE)[keyof typeof WORK_ARTIFACT_SOURCE];
