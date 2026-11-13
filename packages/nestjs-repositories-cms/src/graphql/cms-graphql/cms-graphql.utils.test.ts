import { POSTGRES_DEFAULT_PAGE_SIZE } from '@openthrottle/nestjs-postgres';
import { describe, expect, it } from 'vitest';

import {
  assertCmsUuid,
  createCmsGraphqlError,
  isCmsUuid,
  parseCmsJsonObject,
  parseCmsStatus,
  toCmsPageOptions,
} from './cms-graphql.utils.ts';

describe('isCmsUuid', () => {
  it('accepts a uuid and rejects anything else', () => {
    expect(isCmsUuid('0b9a4f1e-5c3d-4e2a-9f10-1234567890ab')).toBe(true);
    expect(isCmsUuid('welcome')).toBe(false);
  });
});

describe('toCmsPageOptions', () => {
  it('defaults skip to 0 and take to the repository page size', () => {
    expect(toCmsPageOptions(null, undefined)).toEqual({
      skip: 0,
      take: POSTGRES_DEFAULT_PAGE_SIZE,
    });
    expect(toCmsPageOptions(5, 10)).toEqual({ skip: 5, take: 10 });
  });
});

describe('createCmsGraphqlError', () => {
  it('puts the code into extensions beside the extras', () => {
    expect(
      createCmsGraphqlError('CONFLICT', 'taken', { field: 'slug' }).extensions,
    ).toEqual({ code: 'CONFLICT', field: 'slug' });
  });
});

describe('parseCmsJsonObject', () => {
  it('returns an object', () => {
    expect(parseCmsJsonObject('x', '{"a":1}')).toEqual({ a: 1 });
  });

  it.each(['nope', '[1]', '3', 'null'])(
    'rejects %s as BAD_USER_INPUT',
    (json) => {
      expect(() => parseCmsJsonObject('x', json)).toThrow(
        expect.objectContaining({
          extensions: expect.objectContaining({ code: 'BAD_USER_INPUT' }),
        }),
      );
    },
  );
});

describe('parseCmsStatus', () => {
  it('passes a known status and null through', () => {
    expect(parseCmsStatus('ACTIVE')).toBe('ACTIVE');
    expect(parseCmsStatus(null)).toBeNull();
  });

  it('rejects an unknown status', () => {
    expect(() => parseCmsStatus('LIVE')).toThrow(/status must be one of/);
  });
});

describe('assertCmsUuid', () => {
  it('throws NOT_FOUND for a non-uuid', () => {
    expect(() => {
      assertCmsUuid('fragment', 'x');
    }).toThrow(
      expect.objectContaining({
        extensions: expect.objectContaining({ code: 'NOT_FOUND' }),
      }),
    );
  });
});
