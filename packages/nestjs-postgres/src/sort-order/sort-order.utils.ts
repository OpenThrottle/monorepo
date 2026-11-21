import type { EntityManager } from 'typeorm';

import {
  SORT_ORDER_DIRECTION,
  SORT_ORDER_EDGE,
  SORT_ORDER_SIDE,
} from './sort-order.constants.ts';
import type {
  SortOrderAssignment,
  SortOrderDirection,
  SortOrderEdge,
  SortOrderInsertResult,
  SortOrderMoveResult,
  SortOrderRebalanced,
  SortOrderReorderResult,
  SortOrderScope,
  SortOrderSide,
} from './sort-order.types.ts';

/**
 * @description The SQL fragments of one scope, quoted once. Built from trusted constants.
 */
interface ScopeSql {
  readonly id: string;
  readonly live: string;
  readonly order: string;
  readonly scope: string;
  readonly table: string;
  readonly tiebreak: string;
}

const IDENTIFIER_PATTERN = /^[a-z_][a-z0-9_]*$/;

/**
 * @description Double-quotes a lower-case SQL identifier. Scope names are code constants, so a
 * malformed one is a programming error and throws rather than returning a result.
 */
const quoteIdentifier = (name: string): string => {
  if (!IDENTIFIER_PATTERN.test(name)) {
    throw new Error(`Invalid SQL identifier in SortOrderScope: ${name}`);
  }

  return `"${name}"`;
};

const toScopeSql = (scope: SortOrderScope): ScopeSql => {
  return {
    id: quoteIdentifier(scope.idColumn),
    live: `(${scope.liveCondition})`,
    order: quoteIdentifier(scope.orderColumn),
    scope: quoteIdentifier(scope.scopeColumn),
    table: quoteIdentifier(scope.table),
    tiebreak: quoteIdentifier(scope.tiebreakColumn),
  };
};

const isRow = (value: unknown): value is Readonly<Record<string, unknown>> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

/**
 * @description The rows of a raw query result. `EntityManager.query` is untyped, so this is
 * the boundary where its result is narrowed.
 */
const toRows = (result: unknown): Readonly<Record<string, unknown>>[] => {
  if (!Array.isArray(result)) {
    return [];
  }

  return result.filter(isRow);
};

const toNumberOrNull = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : null;
};

const toStringOrNull = (value: unknown): string | null => {
  if (value === null || value === undefined) {
    return null;
  }

  return String(value);
};

/**
 * @description Runs `work` with the scope's advisory lock held for the rest of the
 * transaction, so concurrent writers to one scope queue up while other scopes and readers are
 * untouched. Joins the caller's transaction when there is one, otherwise opens its own.
 */
const withScopeLock = async <TResult>(
  manager: EntityManager,
  scope: SortOrderScope,
  scopeId: string,
  work: (transaction: EntityManager) => Promise<TResult>,
): Promise<TResult> => {
  const run = async (transaction: EntityManager): Promise<TResult> => {
    await transaction.query('SELECT pg_advisory_xact_lock(hashtext($1))', [
      `${scope.table}:${scopeId}`,
    ]);

    return work(transaction);
  };

  if (manager.queryRunner?.isTransactionActive === true) {
    return run(manager);
  }

  return manager.transaction(run);
};

/**
 * @description Writes `assignments` in two set-based passes: park every listed row in a
 * negative band below all of the scope's live values, then write the final values. Neither
 * pass can collide with the partial unique index, because the final values are ones the
 * listed rows held themselves or that no live row holds. Callers pass only ids they just read
 * as live rows of the scope, and hold the scope lock.
 */
const assignSortOrders = async (
  transaction: EntityManager,
  scope: SortOrderScope,
  scopeId: string,
  assignments: readonly SortOrderAssignment[],
): Promise<void> => {
  if (assignments.length === 0) {
    return;
  }

  const sql = toScopeSql(scope);
  const ids = assignments.map((assignment) => {
    return assignment.id;
  });
  const values = assignments.map((assignment) => {
    return assignment.sortOrder;
  });

  await transaction.query(
    `UPDATE ${sql.table} AS t
        SET ${sql.order} = band.base - listed.ordinal
       FROM unnest($2::text[]) WITH ORDINALITY AS listed(id, ordinal),
            (SELECT LEAST(COALESCE(MIN(${sql.order}), 0), 0) - 1 AS base
               FROM ${sql.table}
              WHERE ${sql.scope}::text = $1 AND ${sql.live}) AS band
      WHERE t.${sql.id}::text = listed.id
        AND t.${sql.scope}::text = $1`,
    [scopeId, ids],
  );
  await transaction.query(
    `UPDATE ${sql.table} AS t
        SET ${sql.order} = target.sort_order
       FROM unnest($2::text[], $3::int[]) AS target(id, sort_order)
      WHERE t.${sql.id}::text = target.id
        AND t.${sql.scope}::text = $1`,
    [scopeId, ids, values],
  );
};

/**
 * @description The value one gap past the scope's first (`start`) or last (`end`) live row, or
 * `gap` for an empty scope. Takes the scope lock, so run it in the transaction that inserts
 * the row for the value to stay free.
 * @public
 */
export const edgeSortOrder = async (
  manager: EntityManager,
  scope: SortOrderScope,
  scopeId: string,
  edge: SortOrderEdge,
): Promise<number> => {
  const sql = toScopeSql(scope);
  const isStart = edge === SORT_ORDER_EDGE.START;
  const aggregate = isStart ? 'MIN' : 'MAX';

  return withScopeLock(manager, scope, scopeId, async (transaction) => {
    const rows = toRows(
      await transaction.query(
        `SELECT ${aggregate}(${sql.order}) AS value
           FROM ${sql.table}
          WHERE ${sql.scope}::text = $1 AND ${sql.live}`,
        [scopeId],
      ),
    );
    const value = toNumberOrNull(rows[0]?.value);

    if (value === null) {
      return scope.gap;
    }

    return isStart ? value - scope.gap : value + scope.gap;
  });
};

/**
 * @description The sort value for a row appended after the scope's last live row.
 * @public
 */
export const appendSortOrder = async (
  manager: EntityManager,
  scope: SortOrderScope,
  scopeId: string,
): Promise<number> => {
  return edgeSortOrder(manager, scope, scopeId, SORT_ORDER_EDGE.END);
};

/**
 * @description Renumbers every live row of the scope onto the gap stride (`gap`, `2 * gap`,
 * …) in current order (sort value, then tiebreak column), reclaiming room for inserts.
 * @public
 */
export const rebalanceScope = async (
  manager: EntityManager,
  scope: SortOrderScope,
  scopeId: string,
): Promise<SortOrderRebalanced> => {
  return withScopeLock(manager, scope, scopeId, async (transaction) => {
    const assignments = await readRebalanceAssignments(
      transaction,
      scope,
      scopeId,
    );

    await assignSortOrders(transaction, scope, scopeId, assignments);

    return { kind: 'rebalanced', rowCount: assignments.length };
  });
};

const readRebalanceAssignments = async (
  transaction: EntityManager,
  scope: SortOrderScope,
  scopeId: string,
): Promise<SortOrderAssignment[]> => {
  const sql = toScopeSql(scope);
  const rows = toRows(
    await transaction.query(
      `SELECT ${sql.id}::text AS id
         FROM ${sql.table}
        WHERE ${sql.scope}::text = $1 AND ${sql.live}
        ORDER BY ${sql.order} ASC, ${sql.tiebreak} ASC, ${sql.id} ASC`,
      [scopeId],
    ),
  );

  return rows.flatMap((row, index) => {
    const id = toStringOrNull(row.id);

    return id === null ? [] : [{ id, sortOrder: (index + 1) * scope.gap }];
  });
};

/**
 * @description The midpoint between the anchor and its neighbour on `side`, or one gap past
 * the anchor when it is the scope's edge on that side; `null` when no integer is free.
 */
const findMidpoint = async (
  transaction: EntityManager,
  scope: SortOrderScope,
  scopeId: string,
  anchorSortOrder: number,
  side: SortOrderSide,
): Promise<number | null> => {
  const sql = toScopeSql(scope);
  const isBefore = side === SORT_ORDER_SIDE.BEFORE;
  const comparison = isBefore ? '<' : '>';
  const aggregate = isBefore ? 'MAX' : 'MIN';
  const rows = toRows(
    await transaction.query(
      `SELECT ${aggregate}(${sql.order}) AS value
         FROM ${sql.table}
        WHERE ${sql.scope}::text = $1 AND ${sql.live}
          AND ${sql.order} ${comparison} $2`,
      [scopeId, anchorSortOrder],
    ),
  );
  const neighbour = toNumberOrNull(rows[0]?.value);

  if (neighbour === null) {
    return isBefore ? anchorSortOrder - scope.gap : anchorSortOrder + scope.gap;
  }
  if (Math.abs(anchorSortOrder - neighbour) <= 1) {
    return null;
  }

  return Math.floor((anchorSortOrder + neighbour) / 2);
};

const readLiveSortOrder = async (
  transaction: EntityManager,
  scope: SortOrderScope,
  scopeId: string,
  id: string,
): Promise<number | null> => {
  const sql = toScopeSql(scope);
  const rows = toRows(
    await transaction.query(
      `SELECT ${sql.order} AS value
         FROM ${sql.table}
        WHERE ${sql.id}::text = $2 AND ${sql.scope}::text = $1 AND ${sql.live}`,
      [scopeId, id],
    ),
  );

  return toNumberOrNull(rows[0]?.value);
};

/**
 * @description A free sort value immediately before or after an anchor row, with no other
 * row between them. When the integer gap is used up it rebalances the scope and retries once.
 * Takes the scope lock, so run it in the transaction that inserts the row.
 * @public
 */
export const insertBeside = async (
  manager: EntityManager,
  scope: SortOrderScope,
  scopeId: string,
  anchorId: string,
  side: SortOrderSide,
): Promise<SortOrderInsertResult> => {
  return withScopeLock(manager, scope, scopeId, async (transaction) => {
    const anchor = await readLiveSortOrder(
      transaction,
      scope,
      scopeId,
      anchorId,
    );

    if (anchor === null) {
      return { kind: 'anchor-not-found' };
    }

    const first = await findMidpoint(transaction, scope, scopeId, anchor, side);

    if (first !== null) {
      return { kind: 'slot', sortOrder: first };
    }

    await assignSortOrders(
      transaction,
      scope,
      scopeId,
      await readRebalanceAssignments(transaction, scope, scopeId),
    );

    const rebalancedAnchor = await readLiveSortOrder(
      transaction,
      scope,
      scopeId,
      anchorId,
    );
    if (rebalancedAnchor === null) {
      return { kind: 'anchor-not-found' };
    }

    const retried = await findMidpoint(
      transaction,
      scope,
      scopeId,
      rebalancedAnchor,
      side,
    );

    if (retried === null) {
      return { kind: 'no-room' };
    }

    return { kind: 'slot', sortOrder: retried };
  });
};

const findDuplicates = (ids: readonly string[]): string[] => {
  const seen = new Set<string>();
  const duplicates = new Set<string>();

  for (const id of ids) {
    if (seen.has(id)) {
      duplicates.add(id);
    }
    seen.add(id);
  }

  return [...duplicates];
};

/**
 * @description Reorders the listed rows among the sort values they already hold: the listed
 * ids take those values, ascending, in list order, and every unlisted row keeps its value. A
 * full list renumbers nothing it does not have to; a one-page list reorders that page in
 * place. Returns the assignments written.
 * @public
 */
export const reorderInScope = async (
  manager: EntityManager,
  scope: SortOrderScope,
  scopeId: string,
  ids: readonly string[],
): Promise<SortOrderReorderResult> => {
  const duplicateIds = findDuplicates(ids);

  if (duplicateIds.length > 0) {
    return { duplicateIds, kind: 'duplicate-ids' };
  }
  if (ids.length === 0) {
    return { assignments: [], kind: 'reordered' };
  }

  const sql = toScopeSql(scope);

  return withScopeLock(manager, scope, scopeId, async (transaction) => {
    const rows = toRows(
      await transaction.query(
        `SELECT ${sql.id}::text AS id, ${sql.order} AS value
           FROM ${sql.table}
          WHERE ${sql.scope}::text = $1 AND ${sql.live}
            AND ${sql.id}::text = ANY($2::text[])`,
        [scopeId, [...ids]],
      ),
    );
    const found = new Set(
      rows.flatMap((row) => {
        const id = toStringOrNull(row.id);

        return id === null ? [] : [id];
      }),
    );
    const missingIds = ids.filter((id) => {
      return !found.has(id);
    });

    if (missingIds.length > 0) {
      return { kind: 'ids-not-in-scope', missingIds };
    }

    const slots = rows
      .flatMap((row) => {
        const value = toNumberOrNull(row.value);

        return value === null ? [] : [value];
      })
      .sort((left, right) => {
        return left - right;
      });
    const assignments = ids.flatMap((id, index) => {
      const sortOrder = slots[index];

      return sortOrder === undefined ? [] : [{ id, sortOrder }];
    });

    await assignSortOrders(transaction, scope, scopeId, assignments);

    return { assignments, kind: 'reordered' };
  });
};

/**
 * @description Swaps a row's sort value with its neighbour's (`UP` = earlier, `DOWN` = later),
 * touching only those two rows. A row already at that end is left alone.
 * @public
 */
export const moveInScope = async (
  manager: EntityManager,
  scope: SortOrderScope,
  id: string,
  direction: SortOrderDirection,
): Promise<SortOrderMoveResult> => {
  const sql = toScopeSql(scope);
  const owner = toRows(
    await manager.query(
      `SELECT ${sql.scope}::text AS scope_id
         FROM ${sql.table}
        WHERE ${sql.id}::text = $1 AND ${sql.live}`,
      [id],
    ),
  )[0];

  if (owner === undefined) {
    return { kind: 'not-found' };
  }

  const scopeId = toStringOrNull(owner.scope_id);

  if (scopeId === null) {
    return { kind: 'not-in-scope' };
  }

  return withScopeLock(manager, scope, scopeId, async (transaction) => {
    const current = await readLiveSortOrder(transaction, scope, scopeId, id);

    if (current === null) {
      return { kind: 'not-found' };
    }

    const isUp = direction === SORT_ORDER_DIRECTION.UP;
    const rows = toRows(
      await transaction.query(
        `SELECT ${sql.id}::text AS id, ${sql.order} AS value
           FROM ${sql.table}
          WHERE ${sql.scope}::text = $1 AND ${sql.live}
            AND ${sql.order} ${isUp ? '<' : '>'} $2
          ORDER BY ${sql.order} ${isUp ? 'DESC' : 'ASC'}
          LIMIT 1`,
        [scopeId, current],
      ),
    );
    const neighbourId = toStringOrNull(rows[0]?.id);
    const neighbourValue = toNumberOrNull(rows[0]?.value);

    if (neighbourId === null || neighbourValue === null) {
      return { kind: 'at-edge', scopeId };
    }

    await assignSortOrders(transaction, scope, scopeId, [
      { id, sortOrder: neighbourValue },
      { id: neighbourId, sortOrder: current },
    ]);

    return { kind: 'moved', neighbourId, scopeId };
  });
};
