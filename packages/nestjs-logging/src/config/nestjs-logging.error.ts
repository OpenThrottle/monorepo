import { PACKAGE_NAME } from './nestjs-logging.config';

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
