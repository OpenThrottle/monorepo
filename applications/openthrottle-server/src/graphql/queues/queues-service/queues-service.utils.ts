const IDEMPOTENCY_KEY_REGEX = /^[a-zA-Z0-9_.:-]+$/;

const MAX_IDEMPOTENCY_KEY_LENGTH = 128;

/** @description BullMQ `jobId` length and character set (portable dedupe keys). */
const MIN_IDEMPOTENCY_KEY_LENGTH = 1;

/**
 * @description Validate and normalize an optional idempotency key (used as a BullMQ `jobId`).
 * Returns `{ key: undefined }` when no key was supplied, the trimmed key when valid, or `{ error }`.
 * Exported so callers can validate BEFORE committing related DB writes (atomic enqueue path).
 */
export function normalizeIdempotencyKey(
  raw: string | null | undefined,
): { readonly key: string | undefined } | { readonly error: string } {
  if (raw === undefined || raw === null || raw === '') {
    return { key: undefined };
  }

  const trimmed = raw.trim();

  if (trimmed.length < MIN_IDEMPOTENCY_KEY_LENGTH) {
    return { error: 'idempotencyKey cannot be empty when provided' };
  }

  if (trimmed.length > MAX_IDEMPOTENCY_KEY_LENGTH) {
    return {
      error: `idempotencyKey must be at most ${MAX_IDEMPOTENCY_KEY_LENGTH} characters`,
    };
  }

  if (!IDEMPOTENCY_KEY_REGEX.test(trimmed)) {
    return {
      error: 'idempotencyKey must contain only letters, digits, and ._:-',
    };
  }

  return { key: trimmed };
}
