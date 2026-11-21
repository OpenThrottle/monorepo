import { createMock } from '@golevelup/ts-vitest';
import type { SelectQueryBuilder } from 'typeorm';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  PAGINATION_DEFAULT_LIMIT,
  PAGINATION_MAX_LIMIT,
} from './pagination.constants.ts';
import {
  hasNextPage,
  paginate,
  resolvePagination,
} from './pagination.utils.ts';

describe('resolvePagination', () => {
  it('defaults limit and offset when no input is provided', () => {
    expect(resolvePagination()).toEqual({
      skip: 0,
      take: PAGINATION_DEFAULT_LIMIT,
    });
  });

  it('defaults limit and offset when fields are null', () => {
    expect(resolvePagination({ limit: null, offset: null })).toEqual({
      skip: 0,
      take: PAGINATION_DEFAULT_LIMIT,
    });
  });

  it('caps limit at the global max', () => {
    expect(resolvePagination({ limit: 10_000 }).take).toBe(
      PAGINATION_MAX_LIMIT,
    );
  });

  it('caps limit at a per-call max override', () => {
    expect(resolvePagination({ limit: 10_000 }, { max: 500 }).take).toBe(500);
    expect(resolvePagination({ limit: 80 }, { max: 50 }).take).toBe(50);
  });

  it('uses a per-call default limit when the caller sends none', () => {
    expect(resolvePagination({}, { defaultLimit: 100, max: 500 }).take).toBe(
      100,
    );
    expect(resolvePagination({ limit: 7 }, { defaultLimit: 100 }).take).toBe(7);
  });

  it('clamps a non-positive limit up to 1', () => {
    expect(resolvePagination({ limit: 0 }).take).toBe(1);
    expect(resolvePagination({ limit: -5 }).take).toBe(1);
  });

  it('floors offset at 0', () => {
    expect(resolvePagination({ offset: -10 }).skip).toBe(0);
  });

  it('passes through valid limit and offset', () => {
    expect(resolvePagination({ limit: 25, offset: 100 })).toEqual({
      skip: 100,
      take: 25,
    });
  });

  it('floors fractional limit and offset', () => {
    expect(resolvePagination({ limit: 25.9, offset: 100.7 })).toEqual({
      skip: 100,
      take: 25,
    });
  });
});

describe('paginate', () => {
  interface Row {
    readonly id: string;
  }

  const rows: Row[] = [{ id: 'a' }, { id: 'b' }];
  const skip = vi.fn();
  const take = vi.fn();
  const getManyAndCount = vi.fn();
  const queryBuilder = createMock<SelectQueryBuilder<Row>>({
    getManyAndCount,
    skip: skip.mockReturnThis(),
    take: take.mockReturnThis(),
  });

  beforeEach(() => {
    vi.clearAllMocks();
    getManyAndCount.mockResolvedValue([rows, 94]);
  });

  it('applies the clamped window and returns items with the total', async () => {
    await expect(
      paginate(queryBuilder, { limit: 50, offset: 50 }),
    ).resolves.toEqual({ items: rows, totalCount: 94 });
    expect(skip).toHaveBeenCalledWith(50);
    expect(take).toHaveBeenCalledWith(50);
  });

  it('uses the defaults when no input is given', async () => {
    await paginate(queryBuilder);

    expect(skip).toHaveBeenCalledWith(0);
    expect(take).toHaveBeenCalledWith(PAGINATION_DEFAULT_LIMIT);
  });

  it('clamps to the per-call max', async () => {
    await paginate(queryBuilder, { limit: 900 }, { max: 500 });

    expect(take).toHaveBeenCalledWith(500);
  });
});

describe('hasNextPage', () => {
  it('is true when rows remain after the page', () => {
    expect(hasNextPage({ items: [1, 2], totalCount: 5 }, 0)).toBe(true);
  });

  it('is false on the last page', () => {
    expect(hasNextPage({ items: [1, 2], totalCount: 5 }, 3)).toBe(false);
  });

  it('is false past the end', () => {
    expect(hasNextPage({ items: [], totalCount: 5 }, 10)).toBe(false);
  });
});
