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

/** @public */
export type CaptureHealthStream =
  (typeof CAPTURE_HEALTH_STREAMS)[keyof typeof CAPTURE_HEALTH_STREAMS];

/** Source label for rows captured without one (NULL or blank `source`). */
export const CAPTURE_HEALTH_UNKNOWN_SOURCE = 'unknown';

/**
 * When telemetry from one (stream, source) pair was last received.
 * @public
 */
export interface CaptureHealthRow {
  readonly lastCapturedAt: Date;
  readonly source: string;
  readonly stream: CaptureHealthStream;
}

/** MAX(timestamptz) raw → Date | null (pg may hand back a Date or an ISO string). */
const toDateOrNull = (value: unknown): Date | null => {
  if (value == null) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(String(value));

  return Number.isNaN(date.getTime()) ? null : date;
};

/**
 * Map raw grouped rows (`source`, `lastCapturedAt`) to {@link CaptureHealthRow}s
 * for one stream. A row whose timestamp cannot be read is dropped rather than
 * reported as captured at an invented time.
 */
export const toCaptureHealthRows = (
  stream: CaptureHealthStream,
  rows: ReadonlyArray<Record<string, unknown>>,
): CaptureHealthRow[] =>
  rows.flatMap((row) => {
    const lastCapturedAt = toDateOrNull(row.lastCapturedAt);

    if (lastCapturedAt === null) {
      return [];
    }

    return [
      {
        lastCapturedAt,
        source:
          row.source == null
            ? CAPTURE_HEALTH_UNKNOWN_SOURCE
            : String(row.source),
        stream,
      },
    ];
  });
