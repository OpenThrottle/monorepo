/**
 * @description The message of a caught value: `error.message` for an `Error`,
 * otherwise `String(error)`. With a `fallback`, an empty or whitespace-only
 * message becomes the fallback, so a caller never surfaces a blank error.
 *
 * @public
 */
export const toErrorMessage = (
  error: unknown,
  fallback: string | undefined = undefined,
): string => {
  const message = error instanceof Error ? error.message : String(error);
  const isBlank = message.trim().length === 0;

  return fallback !== undefined && isBlank ? fallback : message;
};
