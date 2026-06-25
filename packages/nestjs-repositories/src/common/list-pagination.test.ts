import { describe, expect, it } from 'vitest';
import {
  LIST_PAGINATION_DEFAULT_LIMIT,
  LIST_PAGINATION_MAX_LIMIT,
  resolveListPagination,
} from './list-pagination';

describe('resolveListPagination', () => {
  it('defaults limit and offset when no input is provided', () => {
    expect(resolveListPagination()).toEqual({
      skip: 0,
      take: LIST_PAGINATION_DEFAULT_LIMIT,
    });
  });

  it('defaults limit and offset when fields are omitted', () => {
    expect(resolveListPagination({})).toEqual({
      skip: 0,
      take: LIST_PAGINATION_DEFAULT_LIMIT,
    });
  });

  it('caps limit at the max bound', () => {
    expect(resolveListPagination({ limit: 10_000 }).take).toBe(
      LIST_PAGINATION_MAX_LIMIT,
    );
  });

  it('clamps a non-positive limit up to 1', () => {
    expect(resolveListPagination({ limit: 0 }).take).toBe(1);
    expect(resolveListPagination({ limit: -5 }).take).toBe(1);
  });

  it('floors offset at 0', () => {
    expect(resolveListPagination({ offset: -10 }).skip).toBe(0);
  });

  it('passes through valid limit and offset', () => {
    expect(resolveListPagination({ limit: 25, offset: 100 })).toEqual({
      skip: 100,
      take: 25,
    });
  });

  it('floors fractional limit and offset', () => {
    expect(resolveListPagination({ limit: 25.9, offset: 100.7 })).toEqual({
      skip: 100,
      take: 25,
    });
  });
});
