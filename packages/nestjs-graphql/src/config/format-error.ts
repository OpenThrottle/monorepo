/**
 * @description Central GraphQL error sanitizer wired in as Apollo's `formatError`.
 *
 * Apollo Server only masks internal error details (stack traces, the original
 * thrown message) when `NODE_ENV === 'production'`, and even then it leaves the
 * scrubbing of arbitrary `extensions` to the application. Without a central
 * `formatError`, an unhandled resolver/DB error leaks internals to clients:
 * `extensions.exception` / `extensions.stacktrace`, raw SQL text, file paths,
 * and the original Error message.
 *
 * This module provides a default `formatError` that:
 *  - Always strips `extensions.exception` and `extensions.stacktrace`, regardless
 *    of environment (these are never useful to a client and only leak internals).
 *  - In production, replaces the message of any error Apollo classified as an
 *    unhandled/internal error (code `INTERNAL_SERVER_ERROR`) with a generic
 *    string, while logging the original error via the provided logger so the
 *    detail is preserved server-side.
 *  - Leaves intentional errors (`BAD_USER_INPUT`, validation failures, custom
 *    Apollo errors carrying their own code/message) untouched apart from the
 *    stacktrace scrub, so clients still get actionable validation feedback.
 *
 * It is override-able: `forRoot` callers can pass their own `formatError` and it
 * takes precedence over this default.
 */

import type { GraphQLFormattedError } from 'graphql';

/** Apollo's error code for errors it did not classify (unhandled / thrown). */
const INTERNAL_SERVER_ERROR_CODE = 'INTERNAL_SERVER_ERROR';

/** Generic client-facing message used in place of leaked internal detail. */
const GENERIC_INTERNAL_ERROR_MESSAGE = 'Internal server error';

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

const isProduction = (): boolean => process.env.NODE_ENV === 'production';

/**
 * Build a stripped copy of an error's `extensions`, removing the keys that leak
 * internals (`exception`, `stacktrace`). Returns `undefined` when nothing
 * meaningful remains so we don't emit an empty `extensions: {}`.
 */
function stripSensitiveExtensions(
  extensions: GraphQLFormattedError['extensions'],
): GraphQLFormattedError['extensions'] {
  if (!extensions) {
    return extensions;
  }

  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(extensions)) {
    if (key === 'exception' || key === 'stacktrace') {
      continue;
    }

    sanitized[key] = value;
  }

  return Object.keys(sanitized).length > 0 ? sanitized : undefined;
}

/**
 * True when Apollo classified this as an unhandled/internal error, i.e. it was
 * not a deliberate ApolloError/validation error carrying its own code.
 */
function isInternalError(formattedError: GraphQLFormattedError): boolean {
  return formattedError.extensions?.code === INTERNAL_SERVER_ERROR_CODE;
}

/**
 * Create an Apollo `formatError` that scrubs sensitive error details before they
 * reach the client, logging the original error server-side when masking.
 *
 * @public
 * @param logger Sink for the original (unmasked) error when masking is applied.
 * @param options Override masking behavior (defaults derived from NODE_ENV).
 */
export function createFormatError(
  logger: FormatErrorLogger,
  options?: CreateFormatErrorOptions,
): (
  formattedError: GraphQLFormattedError,
  error: unknown,
) => GraphQLFormattedError {
  const maskInternalErrors = options?.maskInternalErrors ?? isProduction();

  return (
    formattedError: GraphQLFormattedError,
    error: unknown,
  ): GraphQLFormattedError => {
    const { extensions: _originalExtensions, ...withoutExtensions } =
      formattedError;
    const extensions = stripSensitiveExtensions(formattedError.extensions);

    // Re-attach extensions only when something survived the strip, so we never
    // emit an empty `extensions: {}` (and never include `exception`/stacktrace).
    const base: GraphQLFormattedError =
      extensions === undefined
        ? withoutExtensions
        : { ...withoutExtensions, extensions };

    if (maskInternalErrors && isInternalError(formattedError)) {
      logger.error('Unhandled GraphQL error', error ?? formattedError);

      return { ...base, message: GENERIC_INTERNAL_ERROR_MESSAGE };
    }

    return base;
  };
}
