import { GraphqlResponseError } from '@openthrottle/react-router-graphql';
import { describe, expect, test } from 'vitest';

import { toActionError } from '../action-errors';

describe('toActionError', () => {
  test('uses the bare server message and stable code of a GraphQL error', () => {
    const error = new GraphqlResponseError({
      extensions: { code: 'WORKSPACE_ROOTS_NOT_CONFIGURED' },
      message: 'Set OPENTHROTTLE_WORKSPACE_ROOTS',
    });

    expect(toActionError(error, 'fallback')).toEqual({
      error: 'Set OPENTHROTTLE_WORKSPACE_ROOTS',
      errorCode: 'WORKSPACE_ROOTS_NOT_CONFIGURED',
    });
  });

  test('omits errorCode when the GraphQL error has none', () => {
    const result = toActionError(
      new GraphqlResponseError({ message: 'nope' }),
      'fallback',
    );

    expect(result).toEqual({ error: 'nope' });
    expect(result).not.toHaveProperty('errorCode');
  });

  test('keeps the message of any other Error', () => {
    expect(toActionError(new Error('network down'), 'fallback')).toEqual({
      error: 'network down',
    });
  });

  test('falls back for non-Error throwables', () => {
    expect(toActionError('weird', 'fallback')).toEqual({ error: 'fallback' });
  });
});
