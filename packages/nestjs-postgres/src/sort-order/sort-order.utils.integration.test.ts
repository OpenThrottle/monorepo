import { randomUUID } from 'node:crypto';

import { isRecord } from '@openthrottle/nodejs-utils';
import { DataSource } from 'typeorm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  SORT_ORDER_DIRECTION,
  SORT_ORDER_GAP,
  SORT_ORDER_SIDE,
} from './sort-order.constants.ts';
import type { SortOrderScope } from './sort-order.types.ts';
import {
  appendSortOrder,
  insertBeside,
  moveInScope,
  rebalanceScope,
  reorderInScope,
} from './sort-order.utils.ts';

/**
 * @description Runs the sort-order helpers against real Postgres, because what they exist for
 * (moving rows past a partial unique index, the advisory lock, concurrent writers) cannot be
 * seen through a mock. Opt-in, because it needs a live database:
 *
 *   POSTGRES_HOST=localhost OT_OPENTHROTTLE_DB_INTEGRATION=true \
 *     pnpm nx run @openthrottle/nestjs-postgres:test --skip-nx-cache \
 *     -- src/sort-order/sort-order.utils.integration.test.ts
 *
 * It creates its own throwaway schema holding `test_ordered_records` (with the same partial
 * unique index shape as `tasks` and `plans`) and drops it afterwards, so it never touches an
 * application table. The connection comes from POSTGRES_URL or the POSTGRES_* pieces; Nx loads
 * the root `.env`, whose POSTGRES_HOST is `host.docker.internal`, so a host run overrides it.
 */

const ENABLED = process.env.OT_OPENTHROTTLE_DB_INTEGRATION === 'true';

const SCHEMA = `ot_sort_order_test_${process.pid}`;

const SCOPE: SortOrderScope = {
  gap: SORT_ORDER_GAP,
  idColumn: 'id',
  liveCondition: 'deleted_at IS NULL',
  orderColumn: 'sort_order',
  scopeColumn: 'scope_id',
  table: 'test_ordered_records',
  tiebreakColumn: 'created_at',
};

interface SeedRow {
  readonly deleted?: boolean;
  readonly sortOrder: number;
}

const resolveUrl = (): string => {
  const url = process.env.POSTGRES_URL?.trim();

  if (url) {
    return url;
  }

  const {
    POSTGRES_DB,
    POSTGRES_HOST,
    POSTGRES_PASSWORD,
    POSTGRES_PORT,
    POSTGRES_USER,
  } = process.env;
  const user = encodeURIComponent(POSTGRES_USER ?? '');
  const password = encodeURIComponent(POSTGRES_PASSWORD ?? '');

  return `postgres://${user}:${password}@${POSTGRES_HOST}:${POSTGRES_PORT}/${POSTGRES_DB}`;
};

/** @description The object rows of an untyped raw query result. */
const toRecords = (result: unknown): Readonly<Record<string, unknown>>[] => {
  return Array.isArray(result) ? result.filter(isRecord) : [];
};

describe.skipIf(!ENABLED)('sort-order helpers (live Postgres)', () => {
  const dataSource = new DataSource({
    extra: { max: 4, options: `-c search_path=${SCHEMA}` },
    type: 'postgres',
    url: resolveUrl(),
  });

  /** @description Inserts rows into a fresh scope and returns their ids in seed order. */
  const seed = async (
    rows: readonly SeedRow[],
    scopeId: string | null = randomUUID(),
  ): Promise<{ ids: string[]; scopeId: string | null }> => {
    const inserted: unknown = await dataSource.query(
      `INSERT INTO test_ordered_records (scope_id, sort_order, deleted_at, created_at)
       SELECT $1::uuid, seed.sort_order,
              CASE WHEN seed.deleted THEN now() END,
              now() + make_interval(secs => seed.ordinal)
         FROM unnest($2::int[], $3::boolean[]) WITH ORDINALITY
              AS seed(sort_order, deleted, ordinal)
        ORDER BY seed.ordinal
       RETURNING id::text AS id`,
      [
        scopeId,
        rows.map((row) => {
          return row.sortOrder;
        }),
        rows.map((row) => {
          return row.deleted === true;
        }),
      ],
    );
    const ids = toRecords(inserted).map((row) => {
      return String(row.id);
    });

    return { ids, scopeId };
  };

  /** @description `id → sort_order` for every row of a scope, soft-deleted ones included. */
  const readOrder = async (
    scopeId: string | null,
  ): Promise<Map<string, number>> => {
    const rows: unknown = await dataSource.query(
      `SELECT id::text AS id, sort_order FROM test_ordered_records
        WHERE scope_id IS NOT DISTINCT FROM $1::uuid`,
      [scopeId],
    );
    const entries = toRecords(rows).map((row): [string, number] => {
      return [String(row.id), Number(row.sort_order)];
    });

    return new Map(entries);
  };

  const idAt = (ids: readonly string[], index: number): string => {
    const id = ids[index];

    if (id === undefined) {
      throw new Error(`seed returned no id at ${index}`);
    }

    return id;
  };

  const scopeOf = (scopeId: string | null): string => {
    if (scopeId === null) {
      throw new Error('expected a scoped seed');
    }

    return scopeId;
  };

  beforeAll(async () => {
    await dataSource.initialize();
    await dataSource.query(`CREATE SCHEMA IF NOT EXISTS ${SCHEMA}`);
    await dataSource.query(
      `CREATE TABLE IF NOT EXISTS test_ordered_records (
         id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
         scope_id uuid NULL,
         sort_order integer NULL,
         created_at timestamptz NOT NULL DEFAULT now(),
         deleted_at timestamptz NULL
       )`,
    );
    await dataSource.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS uq_test_ordered_records_scope_sort_order
         ON test_ordered_records (scope_id, sort_order) WHERE deleted_at IS NULL`,
    );
  });

  afterAll(async () => {
    if (dataSource.isInitialized) {
      await dataSource.query(`DROP SCHEMA IF EXISTS ${SCHEMA} CASCADE`);
      await dataSource.destroy();
    }
  });

  describe('appendSortOrder', () => {
    it('starts an empty scope at one gap', async () => {
      await expect(
        appendSortOrder(dataSource.manager, SCOPE, randomUUID()),
      ).resolves.toBe(SORT_ORDER_GAP);
    });

    it('appends one gap past the last live row, ignoring soft-deleted rows', async () => {
      const { scopeId } = await seed([
        { sortOrder: 1000 },
        { sortOrder: 2000 },
        { deleted: true, sortOrder: 9000 },
      ]);

      await expect(
        appendSortOrder(dataSource.manager, SCOPE, scopeOf(scopeId)),
      ).resolves.toBe(3000);
    });
  });

  describe('reorderInScope', () => {
    it('reorders a full list onto the values it already held', async () => {
      const { ids, scopeId } = await seed([
        { sortOrder: 1000 },
        { sortOrder: 2000 },
        { sortOrder: 3000 },
      ]);
      const [a, b, c] = [idAt(ids, 0), idAt(ids, 1), idAt(ids, 2)];

      await expect(
        reorderInScope(dataSource.manager, SCOPE, scopeOf(scopeId), [c, a, b]),
      ).resolves.toMatchObject({ kind: 'reordered' });

      const order = await readOrder(scopeId);

      expect([order.get(c), order.get(a), order.get(b)]).toEqual([
        1000, 2000, 3000,
      ]);
    });

    it('reorders a partial list in place and leaves unlisted rows alone', async () => {
      const { ids, scopeId } = await seed([
        { sortOrder: 1000 },
        { sortOrder: 2000 },
        { sortOrder: 3000 },
        { sortOrder: 4000 },
        { sortOrder: 5000 },
      ]);

      await reorderInScope(dataSource.manager, SCOPE, scopeOf(scopeId), [
        idAt(ids, 3),
        idAt(ids, 1),
      ]);

      const order = await readOrder(scopeId);

      expect(ids.map((id) => order.get(id))).toEqual([
        1000, 4000, 3000, 2000, 5000,
      ]);
    });

    it('rejects an id outside the scope and a repeated id without writing', async () => {
      const { ids, scopeId } = await seed([
        { sortOrder: 1000 },
        { sortOrder: 2000 },
      ]);
      const other = await seed([{ sortOrder: 1000 }]);
      const before = await readOrder(scopeId);

      await expect(
        reorderInScope(dataSource.manager, SCOPE, scopeOf(scopeId), [
          idAt(ids, 1),
          idAt(other.ids, 0),
        ]),
      ).resolves.toEqual({
        kind: 'ids-not-in-scope',
        missingIds: [idAt(other.ids, 0)],
      });
      await expect(
        reorderInScope(dataSource.manager, SCOPE, scopeOf(scopeId), [
          idAt(ids, 0),
          idAt(ids, 0),
        ]),
      ).resolves.toEqual({
        duplicateIds: [idAt(ids, 0)],
        kind: 'duplicate-ids',
      });
      expect(await readOrder(scopeId)).toEqual(before);
    });

    it('treats a soft-deleted row as outside the scope and never moves it', async () => {
      const { ids, scopeId } = await seed([
        { sortOrder: 1000 },
        { deleted: true, sortOrder: 2000 },
        { sortOrder: 3000 },
      ]);

      await expect(
        reorderInScope(dataSource.manager, SCOPE, scopeOf(scopeId), [
          idAt(ids, 2),
          idAt(ids, 1),
        ]),
      ).resolves.toMatchObject({ kind: 'ids-not-in-scope' });
      await reorderInScope(dataSource.manager, SCOPE, scopeOf(scopeId), [
        idAt(ids, 2),
        idAt(ids, 0),
      ]);

      const order = await readOrder(scopeId);

      expect(ids.map((id) => order.get(id))).toEqual([3000, 2000, 1000]);
    });
  });

  describe('moveInScope', () => {
    it('swaps with the earlier row on UP and the later row on DOWN', async () => {
      const { ids, scopeId } = await seed([
        { sortOrder: 1000 },
        { sortOrder: 2000 },
        { sortOrder: 3000 },
      ]);

      await expect(
        moveInScope(
          dataSource.manager,
          SCOPE,
          idAt(ids, 1),
          SORT_ORDER_DIRECTION.UP,
        ),
      ).resolves.toEqual({
        kind: 'moved',
        neighbourId: idAt(ids, 0),
        scopeId,
      });
      await moveInScope(
        dataSource.manager,
        SCOPE,
        idAt(ids, 1),
        SORT_ORDER_DIRECTION.DOWN,
      );
      await moveInScope(
        dataSource.manager,
        SCOPE,
        idAt(ids, 1),
        SORT_ORDER_DIRECTION.DOWN,
      );

      const order = await readOrder(scopeId);

      expect(ids.map((id) => order.get(id))).toEqual([1000, 3000, 2000]);
    });

    it('leaves the first row on UP and the last row on DOWN', async () => {
      const { ids, scopeId } = await seed([
        { sortOrder: 1000 },
        { sortOrder: 2000 },
      ]);

      await expect(
        moveInScope(
          dataSource.manager,
          SCOPE,
          idAt(ids, 0),
          SORT_ORDER_DIRECTION.UP,
        ),
      ).resolves.toEqual({ kind: 'at-edge', scopeId });
      await expect(
        moveInScope(
          dataSource.manager,
          SCOPE,
          idAt(ids, 1),
          SORT_ORDER_DIRECTION.DOWN,
        ),
      ).resolves.toEqual({ kind: 'at-edge', scopeId });
    });

    it('skips a soft-deleted neighbour', async () => {
      const { ids, scopeId } = await seed([
        { sortOrder: 1000 },
        { deleted: true, sortOrder: 2000 },
        { sortOrder: 3000 },
      ]);

      await moveInScope(
        dataSource.manager,
        SCOPE,
        idAt(ids, 2),
        SORT_ORDER_DIRECTION.UP,
      );

      const order = await readOrder(scopeId);

      expect(ids.map((id) => order.get(id))).toEqual([3000, 2000, 1000]);
    });

    it('reports a missing row and a row with no scope', async () => {
      const loose = await seed([{ sortOrder: 1000 }], null);

      await expect(
        moveInScope(
          dataSource.manager,
          SCOPE,
          randomUUID(),
          SORT_ORDER_DIRECTION.UP,
        ),
      ).resolves.toEqual({ kind: 'not-found' });
      await expect(
        moveInScope(
          dataSource.manager,
          SCOPE,
          idAt(loose.ids, 0),
          SORT_ORDER_DIRECTION.UP,
        ),
      ).resolves.toEqual({ kind: 'not-in-scope' });
    });
  });

  describe('rebalanceScope', () => {
    it('renumbers onto the gap stride from negative and crowded values', async () => {
      const { ids, scopeId } = await seed([
        { sortOrder: -1000 },
        { sortOrder: 0 },
        { sortOrder: 7 },
        { sortOrder: 8 },
        { deleted: true, sortOrder: 2000 },
      ]);

      await expect(
        rebalanceScope(dataSource.manager, SCOPE, scopeOf(scopeId)),
      ).resolves.toEqual({ kind: 'rebalanced', rowCount: 4 });

      const order = await readOrder(scopeId);

      expect(ids.map((id) => order.get(id))).toEqual([
        1000, 2000, 3000, 4000, 2000,
      ]);
    });
  });

  describe('insertBeside', () => {
    it('returns the midpoint beside an anchor, or one gap past an edge', async () => {
      const { ids, scopeId } = await seed([
        { sortOrder: 1000 },
        { sortOrder: 2000 },
      ]);

      await expect(
        insertBeside(
          dataSource.manager,
          SCOPE,
          scopeOf(scopeId),
          idAt(ids, 0),
          SORT_ORDER_SIDE.AFTER,
        ),
      ).resolves.toEqual({ kind: 'slot', sortOrder: 1500 });
      await expect(
        insertBeside(
          dataSource.manager,
          SCOPE,
          scopeOf(scopeId),
          idAt(ids, 0),
          SORT_ORDER_SIDE.BEFORE,
        ),
      ).resolves.toEqual({ kind: 'slot', sortOrder: 0 });
      await expect(
        insertBeside(
          dataSource.manager,
          SCOPE,
          scopeOf(scopeId),
          idAt(ids, 1),
          SORT_ORDER_SIDE.AFTER,
        ),
      ).resolves.toEqual({ kind: 'slot', sortOrder: 3000 });
    });

    it('rebalances once when the gap is used up', async () => {
      const { ids, scopeId } = await seed([
        { sortOrder: 1000 },
        { sortOrder: 1001 },
      ]);

      await expect(
        insertBeside(
          dataSource.manager,
          SCOPE,
          scopeOf(scopeId),
          idAt(ids, 0),
          SORT_ORDER_SIDE.AFTER,
        ),
      ).resolves.toEqual({ kind: 'slot', sortOrder: 1500 });

      const order = await readOrder(scopeId);

      expect(ids.map((id) => order.get(id))).toEqual([1000, 2000]);
    });

    it('reports an anchor that is not a live row of the scope', async () => {
      const { ids, scopeId } = await seed([
        { sortOrder: 1000 },
        { deleted: true, sortOrder: 2000 },
      ]);

      await expect(
        insertBeside(
          dataSource.manager,
          SCOPE,
          scopeOf(scopeId),
          idAt(ids, 1),
          SORT_ORDER_SIDE.AFTER,
        ),
      ).resolves.toEqual({ kind: 'anchor-not-found' });
    });
  });

  describe('concurrency', () => {
    it('serialises concurrent writers to one scope without a unique violation', async () => {
      const { ids, scopeId } = await seed([
        { sortOrder: 1000 },
        { sortOrder: 2000 },
        { sortOrder: 3000 },
        { sortOrder: 4000 },
      ]);
      const scope = scopeOf(scopeId);

      const results = await Promise.all([
        reorderInScope(dataSource.manager, SCOPE, scope, [...ids].reverse()),
        reorderInScope(dataSource.manager, SCOPE, scope, [
          idAt(ids, 1),
          idAt(ids, 0),
          idAt(ids, 3),
          idAt(ids, 2),
        ]),
        moveInScope(
          dataSource.manager,
          SCOPE,
          idAt(ids, 2),
          SORT_ORDER_DIRECTION.UP,
        ),
        rebalanceScope(dataSource.manager, SCOPE, scope),
      ]);

      expect(results.map((result) => result.kind)).toEqual([
        'reordered',
        'reordered',
        'moved',
        'rebalanced',
      ]);

      const values = [...(await readOrder(scopeId)).values()].sort(
        (left, right) => {
          return left - right;
        },
      );

      expect(values).toEqual([1000, 2000, 3000, 4000]);
    });
  });
});
