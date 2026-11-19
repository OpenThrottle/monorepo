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
 *    string and reduces its `extensions` to `{ code }`, while logging the
 *    original error via the provided logger so the detail is preserved
 *    server-side. The reduction is an allowlist on purpose: the Nest Apollo
 *    driver copies an unmapped HttpException's response body into
 *    `extensions.originalError` (and its status into `extensions.status`), so
 *    stripping only the message would still deliver the masked detail.
 *  - Gives intentional Nest `NotFoundException` / `ConflictException` throws
 *    the stable codes `NOT_FOUND` / `CONFLICT` with their authored message, in
 *    every environment. The Nest Apollo driver maps only 400/401/403/422 to
 *    codes; anything else arrives as `INTERNAL_SERVER_ERROR` and would be masked.
 *  - Leaves intentional errors (`BAD_USER_INPUT`, validation failures, custom
 *    Apollo errors carrying their own code/message) untouched apart from the
 *    stacktrace scrub, so clients still get actionable validation feedback.
 *
 * It is override-able: `forRoot` callers can pass their own `formatError` and it
 * takes precedence over this default.
 */
import { HttpException, HttpStatus } from '@nestjs/common';
import type { GraphQLFormattedError } from 'graphql';

import type {
  CreateFormatErrorOptions,
  FormatErrorLogger,
} from './format-error.types.ts';

/** Apollo's error code for errors it did not classify (unhandled / thrown). */
const INTERNAL_SERVER_ERROR_CODE = 'INTERNAL_SERVER_ERROR';

/** Generic client-facing message used in place of leaked internal detail. */
const GENERIC_INTERNAL_ERROR_MESSAGE = 'Internal server error';
/**
 * HTTP statuses a resolver throws on purpose for the client to read, and the
 * stable code each one gets. Statuses the Nest Apollo driver already maps
 * (400, 401, 403, 422) are not listed.
 */
const CLIENT_FACING_HTTP_CODES: ReadonlyMap<number, string> = new Map([
  [HttpStatus.CONFLICT, 'CONFLICT'],
  [HttpStatus.NOT_FOUND, 'NOT_FOUND'],
]);

const isProduction = (): boolean => {
  return process.env.NODE_ENV === 'production';
};

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
 * The thrown value behind Apollo's resolver-error wrapper. Reads the
 * `originalError` field rather than using Apollo's `unwrapResolverError`,
 * whose `instanceof GraphQLError` check fails whenever Apollo and the caller
 * load different builds (CJS vs ESM) of `graphql`.
 */
function unwrapOriginalError(error: unknown): unknown {
  if (error instanceof Error && 'originalError' in error) {
    return error.originalError ?? error;
  }

  return error;
}

/**
 * The stable code for an intentional client-facing HttpException (see
 * {@link CLIENT_FACING_HTTP_CODES}), or `undefined` for anything else.
 */
function getClientFacingCode(error: unknown): string | undefined {
  const exception = unwrapOriginalError(error);

  if (!(exception instanceof HttpException)) {
    return undefined;
  }

  return CLIENT_FACING_HTTP_CODES.get(exception.getStatus());
}

/**
 * Drop the keys the Nest Apollo driver adds for an unmapped HttpException
 * (`originalError`, `status`) and set the stable `code`.
 */
function withClientFacingCode(
  extensions: GraphQLFormattedError['extensions'],
  code: string,
): Record<string, unknown> {
  const sanitized: Record<string, unknown> = { code };

  for (const [key, value] of Object.entries(extensions ?? {})) {
    if (key === 'code' || key === 'originalError' || key === 'status') {
      continue;
    }

    sanitized[key] = value;
  }

  return sanitized;
}

/**
 * Re-attach `extensions` only when something survived the strip, so we never
 * emit an empty `extensions: {}`.
 */
function attachExtensions(
  withoutExtensions: Omit<GraphQLFormattedError, 'extensions'>,
  extensions: GraphQLFormattedError['extensions'],
): GraphQLFormattedError {
  if (extensions === undefined) {
    return withoutExtensions;
  }

  return { ...withoutExtensions, extensions };
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
    const base = attachExtensions(withoutExtensions, extensions);

    const clientFacingCode = isInternalError(formattedError)
      ? getClientFacingCode(error)
      : undefined;

    if (clientFacingCode !== undefined) {
      return {
        ...withoutExtensions,
        extensions: withClientFacingCode(extensions, clientFacingCode),
      };
    }

    if (maskInternalErrors && isInternalError(formattedError)) {
      logger.error('Unhandled GraphQL error', error ?? formattedError);

      return {
        ...withoutExtensions,
        extensions: { code: INTERNAL_SERVER_ERROR_CODE },
        message: GENERIC_INTERNAL_ERROR_MESSAGE,
      };
    }

    return base;
  };
}
