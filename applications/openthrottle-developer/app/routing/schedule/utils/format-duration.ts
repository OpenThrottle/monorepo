/**
 * @description Format a scheduled-job run duration (finishedAt − startedAt) for display. Returns an
 * em dash when the run has not both started and finished, so in-flight/queued rows stay aligned.
 * Otherwise renders a compact `1h 2m 3s` / `2m 3s` / `3s` string (sub-second rounds up to `1s`).
 */
export const formatDuration = (
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

  const totalSeconds = Math.max(1, Math.round(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return [
    hours ? `${hours}h` : null,
    hours || minutes ? `${minutes}m` : null,
    `${seconds}s`,
  ]
    .filter(Boolean)
    .join(' ');
};
