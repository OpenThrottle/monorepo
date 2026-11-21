import { createMock } from '@golevelup/ts-vitest';
import type { EntityManager } from 'typeorm';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  SORT_ORDER_DIRECTION,
  SORT_ORDER_GAP,
} from './sort-order.constants.ts';
import type { SortOrderScope } from './sort-order.types.ts';
import {
  appendSortOrder,
  moveInScope,
  reorderInScope,
} from './sort-order.utils.ts';

const SCOPE: SortOrderScope = {
  gap: SORT_ORDER_GAP,
  idColumn: 'id',
  liveCondition: 'deleted_at IS NULL',
  orderColumn: 'sort_order',
  scopeColumn: 'plan_id',
  table: 'tasks',
  tiebreakColumn: 'created_at',
};

describe('sort-order helpers', () => {
  const query = vi.fn();
  const manager = createMock<EntityManager>({
    query,
    queryRunner: createMock({ isTransactionActive: true }),
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('reorderInScope', () => {
    it('reports duplicate ids without touching the database', async () => {
      await expect(
        reorderInScope(manager, SCOPE, 'plan-1', ['a', 'b', 'a']),
      ).resolves.toEqual({ duplicateIds: ['a'], kind: 'duplicate-ids' });
      expect(query).not.toHaveBeenCalled();
    });

    it('treats an empty list as nothing to reorder', async () => {
      await expect(
        reorderInScope(manager, SCOPE, 'plan-1', []),
      ).resolves.toEqual({
        assignments: [],
        kind: 'reordered',
      });
      expect(query).not.toHaveBeenCalled();
    });

    it('takes the scope lock inside the caller transaction', async () => {
      query
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([
          { id: 'a', value: 2000 },
          { id: 'b', value: 1000 },
        ])
        .mockResolvedValue([]);

      await expect(
        reorderInScope(manager, SCOPE, 'plan-1', ['a', 'b']),
      ).resolves.toEqual({
        assignments: [
          { id: 'a', sortOrder: 1000 },
          { id: 'b', sortOrder: 2000 },
        ],
        kind: 'reordered',
      });
      expect(query).toHaveBeenNthCalledWith(
        1,
        'SELECT pg_advisory_xact_lock(hashtext($1))',
        ['tasks:plan-1'],
      );
      expect(manager.transaction).not.toHaveBeenCalled();
    });

    it('lists the ids that are not live rows of the scope', async () => {
      query
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ id: 'a', value: 1000 }]);

      await expect(
        reorderInScope(manager, SCOPE, 'plan-1', ['a', 'b']),
      ).resolves.toEqual({ kind: 'ids-not-in-scope', missingIds: ['b'] });
    });
  });

  describe('appendSortOrder', () => {
    it('starts an empty scope at one gap and appends past the max', async () => {
      query.mockResolvedValueOnce([]).mockResolvedValueOnce([{ value: null }]);
      await expect(appendSortOrder(manager, SCOPE, 'plan-1')).resolves.toBe(
        SORT_ORDER_GAP,
      );

      query
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ value: '4000' }]);
      await expect(appendSortOrder(manager, SCOPE, 'plan-1')).resolves.toBe(
        5000,
      );
    });
  });

  describe('moveInScope', () => {
    it('reports a missing row and a row with no scope', async () => {
      query.mockResolvedValueOnce([]);
      await expect(
        moveInScope(manager, SCOPE, 'x', SORT_ORDER_DIRECTION.UP),
      ).resolves.toEqual({ kind: 'not-found' });

      query.mockResolvedValueOnce([{ scope_id: null }]);
      await expect(
        moveInScope(manager, SCOPE, 'x', SORT_ORDER_DIRECTION.UP),
      ).resolves.toEqual({ kind: 'not-in-scope' });
    });
  });

  it('rejects a scope identifier that is not a plain lower-case name', async () => {
    await expect(
      appendSortOrder(manager, { ...SCOPE, table: 'tasks; DROP TABLE x' }, 'p'),
    ).rejects.toThrow('Invalid SQL identifier');
  });
});
