/**
 * @description Thrown when an id cannot be resolved to a registered driver — either because it is
 * not a known {@link DriverId} (from `parseDriverId`) or because no driver is registered for it yet
 * (from `getDriver`). The message wording keeps the "Unknown driver" /
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
