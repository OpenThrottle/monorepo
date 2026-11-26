/**
 * @description Thrown by `runAgentPrompt` when a config requests a tuning knob the resolved driver
 * does not advertise (e.g. a `model` on a driver without `supportsModelFlag`, or an `endpoint` on a
 * driver without `supportsCustomBaseUrl`). Surfaced as a typed error instead of silently dropping the
 * flag, so a caller learns the invocation would not do what they asked.
 * @public
 */
export class DriverCapabilityError extends Error {
  readonly capability: string;
  readonly driverId: string;

  constructor(driverId: string, capability: string, reason: string) {
    super(`Driver "${driverId}" does not support ${capability}: ${reason}`);
    this.name = 'DriverCapabilityError';
    this.capability = capability;
    this.driverId = driverId;
  }
}
