import { asMock } from '@openthrottle/nestjs-testing';
import { describe, expect, test, vi } from 'vitest';
import {
  createCollectionByColumnLoader,
  createEntityByIdLoader,
  createGroupedCountLoader,
  type RepositoryAccessor,
} from './entity-loaders';

interface Row {
  id: string;
  planId?: string | null;
}

const accessorFor = <T>(repo: unknown): RepositoryAccessor<T & object> =>
  asMock<RepositoryAccessor<T & object>>({ getRepository: () => repo });

describe('createEntityByIdLoader', () => {
  test('batches many load() calls into one find and maps to key order', async () => {
    const find = vi
      .fn()
      .mockResolvedValue([{ id: 'b' }, { id: 'a' }] satisfies Row[]);
    const loader = createEntityByIdLoader<Row>(accessorFor({ find }));

    const [a, b, missing] = await Promise.all([
      loader.load('a'),
      loader.load('b'),
      loader.load('c'),
    ]);

    expect(find).toHaveBeenCalledTimes(1);
    expect(a?.id).toBe('a');
    expect(b?.id).toBe('b');
    expect(missing).toBeNull();
  });
});

describe('createCollectionByColumnLoader', () => {
  test('groups rows by column into key order, empty array for missing keys', async () => {
    const find = vi.fn().mockResolvedValue([
      { id: '1', planId: 'p1' },
      { id: '2', planId: 'p1' },
      { id: '3', planId: 'p2' },
    ] satisfies Row[]);
    const loader = createCollectionByColumnLoader<Row>(accessorFor({ find }), {
      column: 'planId',
    });

    const [p1, p2, p3] = await Promise.all([
      loader.load('p1'),
      loader.load('p2'),
      loader.load('p3'),
    ]);

    expect(find).toHaveBeenCalledTimes(1);
    expect(p1.map((r) => r.id)).toEqual(['1', '2']);
    expect(p2.map((r) => r.id)).toEqual(['3']);
    expect(p3).toEqual([]);
  });
});

describe('createGroupedCountLoader', () => {
  test('returns counts per key in key order, 0 for missing keys', async () => {
    const getRawMany = vi.fn().mockResolvedValue([
      { count: '2', key: 'p1' },
      { count: '5', key: 'p2' },
    ]);
    const qb = {
      addSelect: vi.fn().mockReturnThis(),
      getRawMany,
      groupBy: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
    };
    const loader = createGroupedCountLoader<Row>(
      accessorFor({ createQueryBuilder: () => qb }),
      { column: 'planId' },
    );

    const [p1, p2, p3] = await Promise.all([
      loader.load('p1'),
      loader.load('p2'),
      loader.load('p3'),
    ]);

    expect(getRawMany).toHaveBeenCalledTimes(1);
    expect(p1).toBe(2);
    expect(p2).toBe(5);
    expect(p3).toBe(0);
  });
});
