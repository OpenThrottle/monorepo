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
