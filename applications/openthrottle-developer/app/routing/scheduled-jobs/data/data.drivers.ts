/**
 * @description Agent driver ids offered in the scheduled-job author form. Mirrors the
 * openthrottle-drivers DRIVER_IDS set; kept as a local literal so the UI doesn't depend on the
 * drivers package. The server re-validates the id via parseDriverId, so a stale entry fails loud.
 */
export const SCHEDULED_JOB_DRIVER_IDS = [
  'claude',
  'codex',
  'cursor',
  'grok',
  'opencode',
] as const;
