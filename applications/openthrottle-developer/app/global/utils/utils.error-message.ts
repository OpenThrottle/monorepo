/**
 * Coalesces a message string to a fallback when it is missing, empty, or
 * whitespace-only. The toast boundary guard suppresses empty messages, so an
 * action returning an empty error string would otherwise surface no toast at
 * all — this keeps a meaningful message on screen.
 */
export const messageOrFallback = (
  message: string | null | undefined,
  fallback: string,
): string =>
  message != null && message.trim().length > 0 ? message : fallback;

/**
 * Extracts a non-empty error message from a caught value, falling back to
 * `fallback` when the value is not an `Error` or its message is empty or
 * whitespace-only.
 */
export const toErrorMessage = (error: unknown, fallback: string): string =>
  messageOrFallback(
    error instanceof Error ? error.message : String(error),
    fallback,
  );
