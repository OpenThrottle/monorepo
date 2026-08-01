/**
 * @description Error types for the driver contract. Replace the legacy
 * `Unsupported execution backend: <id>` string thrown in three places across tools/workflows.
 */

/**
 * @description Thrown when an id cannot be resolved to a registered driver — either because it is
 * not a known {@link DriverId} (from `parseDriverId`) or because no driver is registered for it yet
 * (from `getDriver`). The message wording preserves the legacy "Unknown execution backend" /
 * "Supported:" substrings so downstream re-exports (agentic-utils `parseWorkflowRunnerId`) stay
 * behavior-compatible.
 * @public
 */
export class UnknownDriverError extends Error {
  readonly driverId: string;

  constructor(message: string, driverId: string) {
    super(message);
    this.name = 'UnknownDriverError';
    this.driverId = driverId;
  }
}

/**
 * @description Thrown by a driver's `buildShellCommand` when the target CLI has no viable
 * headless/print invocation mode, so shipping a broken command would be worse than failing loudly.
 * @public
 */
export class UnsupportedDriverModeError extends Error {
  readonly driverId: string;

  constructor(driverId: string, reason: string) {
    super(`Driver "${driverId}" has no supported headless mode: ${reason}`);
    this.name = 'UnsupportedDriverModeError';
    this.driverId = driverId;
  }
}

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
