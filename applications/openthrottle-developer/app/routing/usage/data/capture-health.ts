/**
 * @description Threshold for the /usage capture-health warning. A (stream,
 * source) pair whose newest row is older than this is flagged as possibly
 * broken: telemetry that stopped for five weeks once went unnoticed because
 * nothing on the page showed when data last arrived.
 */

/** Hours without a captured row before a source is flagged as stale. */
export const CAPTURE_HEALTH_STALE_AFTER_HOURS = 24;

/** {@link CAPTURE_HEALTH_STALE_AFTER_HOURS} in milliseconds. */
export const CAPTURE_HEALTH_STALE_AFTER_MS =
  CAPTURE_HEALTH_STALE_AFTER_HOURS * 60 * 60 * 1000;
