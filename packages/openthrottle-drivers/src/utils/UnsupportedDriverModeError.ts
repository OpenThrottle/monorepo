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
