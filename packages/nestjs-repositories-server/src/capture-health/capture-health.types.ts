import type { CAPTURE_HEALTH_STREAMS } from './capture-health.constants.ts';
/** @public */
export type CaptureHealthStream =
  (typeof CAPTURE_HEALTH_STREAMS)[keyof typeof CAPTURE_HEALTH_STREAMS];

/**
 * When telemetry from one (stream, source) pair was last received.
 * @public
 */
export interface CaptureHealthRow {
  readonly lastCapturedAt: Date;
  readonly source: string;
  readonly stream: CaptureHealthStream;
}
