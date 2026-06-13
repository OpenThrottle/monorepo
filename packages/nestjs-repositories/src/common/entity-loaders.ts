/**
 * @description Factory helpers for request-scoped TypeORM DataLoaders. Each
 * factory takes a service that exposes `getRepository()` and returns a
 * DataLoader that batches per-row relation resolution into a single query,
 * eliminating the boilerplate previously repeated in every `*Loaders` class.
 * Create one DataLoader per GraphQL request (a request-scoped Nest provider) to
 * batch and cache within the request without leaking across requests.
 */

import DataLoader from 'dataloader';
import { In } from 'typeorm';
import type {
  FindOptionsOrder,
  FindOptionsWhere,
  ObjectLiteral,
  Repository,
} from 'typeorm';

/**
 * @description Anything that exposes a TypeORM repository — every `*Service` in
 * this package satisfies this via its `getRepository()` method, so the loader
 * factories accept services directly.
 */
export interface RepositoryAccessor<TEntity extends ObjectLiteral> {
  getRepository(): Repository<TEntity>;
}

/**
 * @description Creates a DataLoader that resolves entities by primary id.
 * Batches many `load(id)` calls into one `find({ where: { id: In(ids) } })` and
 * maps rows back to key order; ids with no row resolve to `null`.
 *
 * Replaces the repeated by-id loader body across the per-module loader classes.
 *
 * @param accessor - A service exposing `getRepository()` (e.g. PlansService).
 * @returns A DataLoader keyed by id returning `TEntity | null`.
 */
export function createEntityByIdLoader<
  TEntity extends ObjectLiteral & { id: string },
>(accessor: RepositoryAccessor<TEntity>): DataLoader<string, TEntity | null> {
  return new DataLoader<string, TEntity | null>(async (ids) => {
    if (ids.length === 0) return [];

    const rows = await accessor.getRepository().find({
      where: { id: In([...ids]) } as FindOptionsWhere<TEntity>,
    });

    const byId = new Map<string, TEntity>();
    for (const row of rows) {
      byId.set(row.id, row);
    }

    return ids.map((id) => byId.get(id) ?? null);
  });
}

/**
 * @description Options for {@link createCollectionByColumnLoader}.
 */
export interface CollectionByColumnLoaderOptions<
  TEntity extends ObjectLiteral,
> {
  /** Foreign-key column to group rows by (e.g. `projectId`). */
  readonly column: keyof TEntity & string;
  /** Optional ordering applied to the single batched query. */
  readonly order?: FindOptionsOrder<TEntity>;
}

/**
 * @description Creates a DataLoader that resolves a *collection* of entities per
 * key, grouped by a foreign-key column. Batches many `load(key)` calls into one
 * `find({ where: { [column]: In(keys) } })` and groups rows back into key order;
 * keys with no rows resolve to `[]`.
 *
 * @param accessor - A service exposing `getRepository()`.
 * @param options - The grouping `column` and optional `order`.
 * @returns A DataLoader keyed by the column value returning `TEntity[]`.
 */
export function createCollectionByColumnLoader<TEntity extends ObjectLiteral>(
  accessor: RepositoryAccessor<TEntity>,
  { column, order }: CollectionByColumnLoaderOptions<TEntity>,
): DataLoader<string, TEntity[]> {
  return new DataLoader<string, TEntity[]>(async (keys) => {
    if (keys.length === 0) return [];

    const ids = [...new Set(keys)];
    const rows = await accessor.getRepository().find({
      order,
      where: { [column]: In(ids) } as FindOptionsWhere<TEntity>,
    });

    const byKey = new Map<string, TEntity[]>();
    for (const row of rows) {
      const key = row[column];
      if (key == null) continue;
      const list = byKey.get(key) ?? [];
      list.push(row);
      byKey.set(key, list);
    }

    return keys.map((key) => byKey.get(key) ?? []);
  });
}

/**
 * @description Options for {@link createGroupedCountLoader}.
 */
export interface GroupedCountLoaderOptions<TEntity extends ObjectLiteral> {
  /** Foreign-key column to count rows by (e.g. `planId`). */
  readonly column: keyof TEntity & string;
}

/**
 * @description Creates a DataLoader that resolves a row *count* per key, grouped
 * by a foreign-key column. Batches many `load(key)` calls into a single grouped
 * `COUNT(*)` query and maps counts back to key order; keys with no rows resolve
 * to `0`.
 *
 * @param accessor - A service exposing `getRepository()`.
 * @param options - The grouping `column`.
 * @returns A DataLoader keyed by the column value returning a count.
 */
export function createGroupedCountLoader<TEntity extends ObjectLiteral>(
  accessor: RepositoryAccessor<TEntity>,
  { column }: GroupedCountLoaderOptions<TEntity>,
): DataLoader<string, number> {
  return new DataLoader<string, number>(async (keys) => {
    if (keys.length === 0) return [];

    const ids = [...new Set(keys)];
    const alias = 'entity';
    const rows = await accessor
      .getRepository()
      .createQueryBuilder(alias)
      .select(`${alias}.${column}`, 'key')
      .addSelect('COUNT(*)', 'count')
      .where(`${alias}.${column} IN (:...ids)`, { ids })
      .groupBy(`${alias}.${column}`)
      .getRawMany<{ count: string; key: string }>();

    const countByKey = new Map<string, number>();
    for (const row of rows) {
      countByKey.set(row.key, Number(row.count));
    }

    return keys.map((key) => countByKey.get(key) ?? 0);
  });
}
