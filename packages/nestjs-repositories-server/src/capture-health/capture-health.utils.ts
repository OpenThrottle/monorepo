import { CAPTURE_HEALTH_UNKNOWN_SOURCE } from './capture-health.constants.ts';
import type {
  CaptureHealthRow,
  CaptureHealthStream,
} from './capture-health.types.ts';
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
): CaptureHealthRow[] => {
  return rows.flatMap((row) => {
    const lastCapturedAt = toDateOrNull(row.lastCapturedAt);

    if (lastCapturedAt === null) {
      return [];
    }

    const unknown = CAPTURE_HEALTH_UNKNOWN_SOURCE;
    const source = row.source == null ? unknown : String(row.source);

    return [{ lastCapturedAt, source, stream }];
  });
};
