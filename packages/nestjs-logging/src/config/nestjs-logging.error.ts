import { PACKAGE_NAME } from './nestjs-logging.config.ts';

/**
 * @description Fail-fast validation or wiring errors for nestjs-logging.
 */
export class NestjsLoggingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = PACKAGE_NAME;
    Object.setPrototypeOf(this, NestjsLoggingError.prototype);
  }
}
