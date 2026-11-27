import { formatDuration } from '@openthrottle/nodejs-utils';

const MIN_RUN_MS = 1000;

/**
 * @description Format a scheduled-job run duration (finishedAt − startedAt) for display. Returns an
 * em dash when the run has not both started and finished, so in-flight/queued rows stay aligned.
 * Otherwise renders a compact `1h 2m 3s` / `2m 3s` / `3s` string (sub-second rounds up to `1s`).
 */
export const formatRunDuration = (
  startedAt?: string | null,
  finishedAt?: string | null,
): string => {
  if (!startedAt || !finishedAt) {
    return '—';
  }

  const ms = new Date(finishedAt).getTime() - new Date(startedAt).getTime();
  if (!Number.isFinite(ms) || ms < 0) {
    return '—';
  }

  return formatDuration(Math.max(MIN_RUN_MS, ms), {
    maxUnits: 3,
    rounding: 'round',
  });
};
