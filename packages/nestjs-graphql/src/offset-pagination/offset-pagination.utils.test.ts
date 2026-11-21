import { GraphQLError } from 'graphql';
import { describe, expect, it } from 'vitest';

import { assertPagination } from './offset-pagination.utils.ts';

const readCode = (run: () => void): unknown => {
  try {
    run();
  } catch (error) {
    return error instanceof GraphQLError ? error.extensions.code : error;
  }

  return undefined;
};

describe('assertPagination', () => {
  it('accepts omitted and null values', () => {
    expect(() => assertPagination({}, { max: 100 })).not.toThrow();
    expect(() => {
      assertPagination({ limit: null, offset: null }, { max: 100 });
    }).not.toThrow();
  });

  it('accepts the bounds themselves', () => {
    expect(() => {
      assertPagination({ limit: 1, offset: 0 }, { max: 100 });
    }).not.toThrow();
    expect(() => assertPagination({ limit: 100 }, { max: 100 })).not.toThrow();
  });

  it('rejects a limit below 1 or above the max with BAD_USER_INPUT', () => {
    expect(() => assertPagination({ limit: 0 }, { max: 100 })).toThrow(
      'limit must be between 1 and 100',
    );
    expect(() => assertPagination({ limit: 501 }, { max: 500 })).toThrow(
      'limit must be between 1 and 500',
    );
    expect(
      readCode(() => {
        assertPagination({ limit: 101 }, { max: 100 });
      }),
    ).toBe('BAD_USER_INPUT');
  });

  it('rejects a negative offset with BAD_USER_INPUT', () => {
    expect(() => assertPagination({ offset: -1 }, { max: 100 })).toThrow(
      'offset must be 0 or more',
    );
    expect(
      readCode(() => {
        assertPagination({ offset: -1 }, { max: 100 });
      }),
    ).toBe('BAD_USER_INPUT');
  });
});
