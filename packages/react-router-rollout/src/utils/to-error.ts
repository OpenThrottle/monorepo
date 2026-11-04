/** Normalizes a thrown value into an `Error`. */
export const toError = (cause: unknown): Error =>
  cause instanceof Error ? cause : new Error(String(cause));
