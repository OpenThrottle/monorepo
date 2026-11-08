/**
 * @description Shared shape for the capture-health signal: per (stream, source),
 * when telemetry last arrived. Both the skill-usage and token-usage services
 * emit these rows so the GraphQL layer can concatenate them without knowing
 * which table each came from.
 */

/**
 * Telemetry streams that report a last-captured time. A stream is one ingest
 * path (a table), not a tool: the same tool can appear in several streams.
 * @public
 */
export const CAPTURE_HEALTH_STREAMS = {
  SKILL_EVENTS: 'skill_events',
  SKILL_OUTCOMES: 'skill_outcomes',
  TOKEN_USAGE: 'token_usage',
} as const;

/** Source label for rows captured without one (NULL or blank `source`). */
export const CAPTURE_HEALTH_UNKNOWN_SOURCE = 'unknown';
