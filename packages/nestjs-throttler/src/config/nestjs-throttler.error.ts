const PACKAGE_NAME = '@openthrottle/nestjs-throttler';

/**
 * @description Fail-fast validation or wiring errors for nestjs-throttler.
 */
export class NestjsThrottlerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = PACKAGE_NAME;
    Object.setPrototypeOf(this, NestjsThrottlerError.prototype);
  }
}
