import {
  ConflictException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { GraphQLFormattedError } from 'graphql';
import { GraphQLError } from 'graphql';
import { describe, expect, it, vi } from 'vitest';

import type { FormatErrorLogger } from './format-error.types.ts';
import { createFormatError } from './format-error.utils.ts';

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

const unmappedHttpExceptionError: GraphQLFormattedError = {
  extensions: {
    code: 'INTERNAL_SERVER_ERROR',
    originalError: {
      error: 'Service Unavailable',
      message: 'relation "skill_tags" does not exist',
      statusCode: 503,
    },
    status: 503,
  },
  message: 'relation "skill_tags" does not exist',
  path: ['renameSkillTag'],
};

/** The shape the Nest Apollo driver hands formatError for an unmapped HttpException. */
const toDriverFormattedError = (
  exception: ConflictException | NotFoundException,
): GraphQLFormattedError => {
  return {
    extensions: {
      code: 'INTERNAL_SERVER_ERROR',
      originalError: exception.getResponse(),
      status: exception.getStatus(),
    },
    message: exception.message,
    path: ['renameSkillTag'],
  };
};

/** What Apollo passes as formatError's second argument: the resolver error wrapper. */
const toResolverError = (exception: Error): GraphQLError => {
  return new GraphQLError(exception.message, {
    originalError: exception,
    path: ['renameSkillTag'],
  });
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

  it('drops originalError and status from a masked error, keeping only the code', () => {
    const logger = createLogger();
    const format = createFormatError(logger, { maskInternalErrors: true });
    const original = new Error('boom');

    const result = format(unmappedHttpExceptionError, original);

    expect(result).toEqual({
      extensions: { code: 'INTERNAL_SERVER_ERROR' },
      message: 'Internal server error',
      path: ['renameSkillTag'],
    });
    expect(JSON.stringify(result)).not.toContain('skill_tags');
    expect(logger.error).toHaveBeenCalledWith(
      'Unhandled GraphQL error',
      original,
    );
  });

  it('keeps originalError and status when masking is disabled', () => {
    const format = createFormatError(createLogger(), {
      maskInternalErrors: false,
    });

    const result = format(unmappedHttpExceptionError, new Error('boom'));

    expect(result.extensions).toEqual(unmappedHttpExceptionError.extensions);
  });

  describe('intentional client-facing HttpExceptions', () => {
    it('maps a NotFoundException to NOT_FOUND with its message, even when masking', () => {
      const logger = createLogger();
      const format = createFormatError(logger, { maskInternalErrors: true });
      const exception = new NotFoundException(
        'Tag "no-such-tag" is not in your skill-tag vocabulary.',
      );

      const result = format(
        toDriverFormattedError(exception),
        toResolverError(exception),
      );

      expect(result).toEqual({
        extensions: { code: 'NOT_FOUND' },
        message: 'Tag "no-such-tag" is not in your skill-tag vocabulary.',
        path: ['renameSkillTag'],
      });
      expect(logger.error).not.toHaveBeenCalled();
    });

    it('maps a ConflictException to CONFLICT with its message', () => {
      const format = createFormatError(createLogger(), {
        maskInternalErrors: true,
      });
      const exception = new ConflictException('sort_order is already taken');

      const result = format(
        toDriverFormattedError(exception),
        toResolverError(exception),
      );

      expect(result.message).toBe('sort_order is already taken');
      expect(result.extensions).toEqual({ code: 'CONFLICT' });
    });

    it('maps the same way when masking is disabled', () => {
      const format = createFormatError(createLogger(), {
        maskInternalErrors: false,
      });
      const exception = new NotFoundException('missing');

      const result = format(
        toDriverFormattedError(exception),
        toResolverError(exception),
      );

      expect(result.extensions).toEqual({ code: 'NOT_FOUND' });
    });

    it('still masks an HttpException whose status is not client-facing', () => {
      const format = createFormatError(createLogger(), {
        maskInternalErrors: true,
      });
      const exception = new ServiceUnavailableException('pg pool exhausted');

      const result = format(
        {
          extensions: {
            code: 'INTERNAL_SERVER_ERROR',
            originalError: exception.getResponse(),
            status: exception.getStatus(),
          },
          message: exception.message,
        },
        toResolverError(exception),
      );

      expect(result).toEqual({
        extensions: { code: 'INTERNAL_SERVER_ERROR' },
        message: 'Internal server error',
      });
    });

    it('ignores a plain error that merely carries a 404 status', () => {
      const format = createFormatError(createLogger(), {
        maskInternalErrors: true,
      });
      const lookalike = Object.assign(new Error('GET /internal 404'), {
        status: 404,
      });

      const result = format(
        {
          extensions: { code: 'INTERNAL_SERVER_ERROR' },
          message: lookalike.message,
        },
        toResolverError(lookalike),
      );

      expect(result.message).toBe('Internal server error');
      expect(result.extensions).toEqual({ code: 'INTERNAL_SERVER_ERROR' });
    });
  });
});
