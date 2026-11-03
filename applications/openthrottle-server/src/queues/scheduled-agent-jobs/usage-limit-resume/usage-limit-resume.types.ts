/**
 * @description What became of a usage-limited scheduled run: continued later (`resumed`, with the
 * continuation run's id) or left alone (`held`, with the reason shown on the limited run).
 */
export type ScheduledUsageLimitHandling =
  | { readonly outcome: 'held'; readonly reason: string }
  | { readonly outcome: 'resumed'; readonly resumeRunId: string };
