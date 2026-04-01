const PACKAGE_NAME = '@openthrottle/nestjs-slack';

/**
 * @description Custom error for @openthrottle/nestjs-slack so validation and
 * other errors are clearly identifiable (e.g. by name or instanceof).
 */
export class NestjsSlackError extends Error {
  constructor(message: string) {
    super(message);
    this.name = PACKAGE_NAME;
    Object.setPrototypeOf(this, NestjsSlackError.prototype);
  }
}
