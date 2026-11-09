/**
 * Minimal logger surface this module needs (matches LoggerService.error).
 *
 * @public
 */
export interface FormatErrorLogger {
  error(message: unknown, ...optionalParams: unknown[]): void;
}

/**
 * Options controlling {@link createFormatError} behavior.
 *
 * @public
 */
export interface CreateFormatErrorOptions {
  /**
   * When true, mask internal (`INTERNAL_SERVER_ERROR`) messages with a generic
   * string. Defaults to `NODE_ENV === 'production'`.
   */
  maskInternalErrors?: boolean;
}
