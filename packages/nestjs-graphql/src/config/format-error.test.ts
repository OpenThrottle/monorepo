import { GraphQLError, type GraphQLFormattedError } from 'graphql';
import { describe, expect, it, vi } from 'vitest';

import { createFormatError, type FormatErrorLogger } from './format-error.ts';

const createLogger = (): FormatErrorLogger => {
  const error: FormatErrorLogger['error'] = vi.fn();

  return { error };
};

const internalError: GraphQLFormattedError = {
  extensions: {
    code: 'INTERNAL_SERVER_ERROR',
    exception: { stacktrace: ['at db.query (pg.ts:1)'] },
    stacktrace: ['at db.query (pg.ts:1)'],
  },
  message: 'select * from users where secret = $1 failed',
};

const userInputError: GraphQLFormattedError = {
  extensions: {
    code: 'BAD_USER_INPUT',
    exception: { stacktrace: ['at validate (foo.ts:2)'] },
  },
  message: 'email must be a valid email',
};

describe('createFormatError', () => {
  it('strips extensions.exception and stacktrace regardless of environment', () => {
    const format = createFormatError(createLogger(), {
      maskInternalErrors: false,
    });

    const result = format(internalError, new Error('boom'));

    expect(result.extensions).toEqual({ code: 'INTERNAL_SERVER_ERROR' });
    expect(result.extensions).not.toHaveProperty('exception');
    expect(result.extensions).not.toHaveProperty('stacktrace');
  });

  it('masks internal error messages and logs the original when masking', () => {
    const logger = createLogger();
    const format = createFormatError(logger, { maskInternalErrors: true });
    const original = new Error('boom');

    const result = format(internalError, original);

    expect(result.message).toBe('Internal server error');
    expect(result.extensions).toEqual({ code: 'INTERNAL_SERVER_ERROR' });
    expect(logger.error).toHaveBeenCalledWith(
      'Unhandled GraphQL error',
      original,
    );
  });

  it('does not mask the message when masking is disabled', () => {
    const logger = createLogger();
    const format = createFormatError(logger, { maskInternalErrors: false });

    const result = format(internalError, new Error('boom'));

    expect(result.message).toBe(internalError.message);
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('leaves deliberate (non-internal) error messages intact', () => {
    const logger = createLogger();
    const format = createFormatError(logger, { maskInternalErrors: true });

    const result = format(userInputError, new Error('boom'));

    expect(result.message).toBe('email must be a valid email');
    expect(result.extensions).toEqual({ code: 'BAD_USER_INPUT' });
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('drops extensions entirely when only sensitive keys were present', () => {
    const logger = createLogger();
    const format = createFormatError(logger, { maskInternalErrors: false });

    const result = format(
      {
        extensions: { exception: { stacktrace: [] }, stacktrace: [] },
        message: 'oops',
      },
      undefined,
    );

    expect(result).not.toHaveProperty('extensions');
  });

  describe('production masking vs. deliberate errors', () => {
    it('preserves the message of a GraphQLError with its own extensions.code', () => {
      const logger = createLogger();
      const format = createFormatError(logger, { maskInternalErrors: true });
      const thrown = new GraphQLError(
        'Set OPENTHROTTLE_WORKSPACE_ROOTS to browse folders',
        { extensions: { code: 'WORKSPACE_ROOTS_NOT_CONFIGURED' } },
      );

      const result = format(thrown.toJSON(), thrown);

      expect(result.message).toBe(
        'Set OPENTHROTTLE_WORKSPACE_ROOTS to browse folders',
      );
      expect(result.extensions).toEqual({
        code: 'WORKSPACE_ROOTS_NOT_CONFIGURED',
      });
      expect(logger.error).not.toHaveBeenCalled();
    });

    it('still masks an unclassified plain Error (INTERNAL_SERVER_ERROR) in production', () => {
      const logger = createLogger();
      const format = createFormatError(logger, { maskInternalErrors: true });
      const thrown = new Error('ENOENT: no such file /srv/secret');
      const formatted: GraphQLFormattedError = {
        extensions: { code: 'INTERNAL_SERVER_ERROR' },
        message: thrown.message,
      };

      const result = format(formatted, thrown);

      expect(result.message).toBe('Internal server error');
      expect(logger.error).toHaveBeenCalledWith(
        'Unhandled GraphQL error',
        thrown,
      );
    });
  });
});
