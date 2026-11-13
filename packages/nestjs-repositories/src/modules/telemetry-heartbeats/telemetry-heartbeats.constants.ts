/**
 * Delivery legs a heartbeat may report. Enforced in Postgres by
 * `telemetry_heartbeats_delivery_leg_check`; widening it means touching the
 * migration as well.
 */
export const TELEMETRY_HEARTBEAT_DELIVERY_LEGS = {
  MARKETPLACE: 'marketplace',
  PLUGIN_DIR: 'plugin-dir',
  REPO: 'repo',
} as const;

/** How many recent total-buffered counts the upsert keeps per key. */
export const TELEMETRY_HEARTBEAT_RECENT_TOTALS_LIMIT = 3;

/**
 * Human-readable member list for validation messages.
 *
 * @public
 */
export const TELEMETRY_HEARTBEAT_DELIVERY_LEG_LIST = Object.values(
  TELEMETRY_HEARTBEAT_DELIVERY_LEGS,
).join(', ');
