/**
 * Hours after which the oldest buffered record counts as stale. Matches the
 * developer app's CAPTURE_HEALTH_STALE_AFTER_HOURS
 * (openthrottle-developer/app/routing/usage/data/data.capture-health.ts) so
 * /usage has one definition of stale; not imported across app boundaries.
 */
export const TELEMETRY_COVERAGE_STALE_AFTER_HOURS = 24;

export const TELEMETRY_COVERAGE_DEFAULT_WINDOW_DAYS = 14;

export const TELEMETRY_COVERAGE_MAX_WINDOW_DAYS = 365;

export const TELEMETRY_COVERAGE_WARNING_KINDS = {
  BUFFER_GROWING: 'BUFFER_GROWING',
  BUFFER_STALE: 'BUFFER_STALE',
  MACHINE_SILENT: 'MACHINE_SILENT',
  MANUAL_SESSIONS_UNCOVERED: 'MANUAL_SESSIONS_UNCOVERED',
  PLUGIN_OUTDATED: 'PLUGIN_OUTDATED',
} as const;

/** Short, factual, server-owned messages; the UI owns its longer copy. */
export const TELEMETRY_COVERAGE_WARNING_MESSAGES = {
  BUFFER_GROWING: `Buffered records rose across the last three heartbeats.`,
  BUFFER_STALE: `The oldest buffered record is more than 24 hours old.`,
  MACHINE_SILENT: `No heartbeat from this machine within the window.`,
  MANUAL_SESSIONS_UNCOVERED: `The marketplace plugin is not installed, so manual sessions are not recorded.`,
  PLUGIN_OUTDATED: `The installed marketplace plugin is older than the current version.`,
} as const;
