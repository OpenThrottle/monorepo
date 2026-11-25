/**
 * @description Artifact verification state (claims vs facts). Mirrors
 * `chk_work_artifacts_verification` (databases/openthrottle/migrations 068). An `as const`
 * object, per repo code style.
 * @public
 */
export const WORK_ARTIFACT_VERIFICATION = {
  /** Verifier could not reconcile the claim (e.g. rebase/branch drift). */
  ORPHANED: 'orphaned',
  /** A claim, not yet confirmed by a verifier. */
  UNVERIFIED: 'unverified',
  /** Confirmed by a verifier, or a first-party server-witnessed event born verified. */
  VERIFIED: 'verified',
} as const;

export type WorkArtifactVerificationKey =
  keyof typeof WORK_ARTIFACT_VERIFICATION;
export type WorkArtifactVerificationValue =
  (typeof WORK_ARTIFACT_VERIFICATION)[WorkArtifactVerificationKey];

/**
 * @description What wrote an artifact. Mirrors `chk_work_artifacts_source`
 * (databases/openthrottle/migrations 068).
 * @public
 */
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

export type WorkArtifactSourceKey = keyof typeof WORK_ARTIFACT_SOURCE;
export type WorkArtifactSourceValue =
  (typeof WORK_ARTIFACT_SOURCE)[WorkArtifactSourceKey];

/**
 * @description Per-plan git-work completeness. `recorded` is the strict test: at least one
 * linked git_commit the verifier confirmed reachable on the default branch, evidenced by a
 * stored `landedSha`.
 *
 * Reachability is read from the verifier's own conclusion rather than re-derived here — it
 * stamps `landedSha` exactly when it confirmed the commit (or its squash) is on the branch, so
 * there is no second, divergent notion of "landed" and no git shell-out or per-row GitHub call
 * on a read path. Ordered unrecorded first, so a truncated list is the owed head.
 */
export const WORK_LEDGER_PLAN_COMPLETENESS_SQL = `
  SELECT
    g.plan_id                         AS "planId",
    p.title                           AS "planTitle",
    p.status                          AS "planStatus",
    g.artifact_count::int             AS "artifactCount",
    g.recorded                        AS "recorded"
  FROM (
    SELECT
      s.plan_id,
      count(*) AS artifact_count,
      bool_or(
        a.lifecycle = 'landed'
        AND a.verification = 'verified'
        AND a.payload->>'landedSha' IS NOT NULL
      ) AS recorded
    FROM work_session_subjects s
    JOIN work_artifacts a
      ON a.session_id = s.session_id
     AND a.type = 'git_commit'
    GROUP BY s.plan_id
  ) g
  JOIN plans p ON p.id = g.plan_id AND p.deleted_at IS NULL
  ORDER BY g.recorded ASC, g.artifact_count DESC, p.title ASC
`;
