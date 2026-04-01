/**
 * @description Error thrown when the server returns 401 Unauthorized. Used to show login UI instead of raw error text.
 */

export class UnauthenticatedError extends Error {
  override readonly name = 'UnauthenticatedError';

  constructor(message = 'Authentication required') {
    super(message);
    Object.setPrototypeOf(this, UnauthenticatedError.prototype);
  }
}
