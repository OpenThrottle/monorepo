import { TELEMETRY_HEARTBEAT_DELIVERY_LEGS } from './telemetry-heartbeats.constants.ts';
import type { TelemetryHeartbeatDeliveryLeg } from './telemetry-heartbeats.types.ts';

const DELIVERY_LEG_VALUES: readonly string[] = Object.values(
  TELEMETRY_HEARTBEAT_DELIVERY_LEGS,
);

/**
 * Type predicate over {@link TELEMETRY_HEARTBEAT_DELIVERY_LEGS}.
 *
 * @public
 */
export const isTelemetryHeartbeatDeliveryLeg = (
  value: string,
): value is TelemetryHeartbeatDeliveryLeg => {
  return DELIVERY_LEG_VALUES.includes(value);
};
