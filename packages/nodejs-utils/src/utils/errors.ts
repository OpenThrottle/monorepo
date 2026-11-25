/**
 * @description The message of a caught value: `error.message` for an `Error`,
 * otherwise `String(error)`. A blank message comes back as it is; use
 * {@link toErrorMessageOr} when the caller must never surface one.
 *
 * @public
 */
export const toErrorMessage = (error: unknown): string => {
  return error instanceof Error ? error.message : String(error);
};

/**
 * @description {@link toErrorMessage}, except that an empty or
 * whitespace-only message becomes `fallback`, so a caller showing the message
 * to a person never shows a blank error.
 *
 * @public
 */
export const toErrorMessageOr = (error: unknown, fallback: string): string => {
  const message = toErrorMessage(error);
  const isBlank = message.trim().length === 0;

  return isBlank ? fallback : message;
};
