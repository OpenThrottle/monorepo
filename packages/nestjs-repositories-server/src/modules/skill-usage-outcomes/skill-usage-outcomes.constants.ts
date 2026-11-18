/**
 * @description Outcome vocabulary, split by who can honestly emit each value.
 *
 * `SUCCESS` / `ERROR` are QUALITY claims and only a deliberate reporter — one
 * that actually knows how the work went — may write them. `SESSION_ENDED` and
 * `ABANDONED` describe the PROCESS: the session finished cleanly, or it died.
 * The automatic session-end hooks can observe nothing beyond those two, so they
 * write nothing else. See migration 113.
 * @public
 */
export const SKILL_USAGE_OUTCOMES = {
  ABANDONED: 'abandoned',
  ERROR: 'error',
  SESSION_ENDED: 'session_ended',
  SUCCESS: 'success',
} as const;

/**
 * @description Which capture contract wrote a row. `LEGACY_ASSUMED_SUCCESS` rows predate
 * migration 113, when the automatic session-end path hardcoded `success`; their
 * outcome is an assumption, not a measurement, so every /usage count excludes
 * them. See migration 114.
 * @public
 */
export const SKILL_USAGE_CAPTURE_MODELS = {
  LEGACY_ASSUMED_SUCCESS: 'legacy_assumed_success',
  REPORTED_V1: 'reported_v1',
} as const;
