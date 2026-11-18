/**
 * @description Factory helpers for request-scoped TypeORM DataLoaders. Each
 * factory takes a service that exposes `getRepository()` and returns a
 * DataLoader that batches per-row relation resolution into a single query,
 * eliminating the boilerplate previously repeated in every `*Loaders` class.
 * Create one DataLoader per GraphQL request (a request-scoped Nest provider) to
 * batch and cache within the request without leaking across requests.
 */
import DataLoader from 'dataloader';
import type { FindOptionsWhere, ObjectLiteral } from 'typeorm';
import { In } from 'typeorm';

import type {
  CollectionByColumnLoaderOptions,
  GroupedCountLoaderOptions,
  RepositoryAccessor,
} from './entity-loaders.types.ts';

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

    const where: FindOptionsWhere<TEntity> = {};
    Object.assign(where, { id: In([...ids]) });
    const rows = await accessor.getRepository().find({ where });

    const byId = new Map<string, TEntity>();
    for (const row of rows) {
      byId.set(row.id, row);
    }

    return ids.map((id) => byId.get(id) ?? null);
  });
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
    const where: FindOptionsWhere<TEntity> = {};
    Object.assign(where, { [column]: In(ids) });
    const rows = await accessor.getRepository().find({ order, where });

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
 * @description Creates a DataLoader that resolves a row *count* per key, grouped
 * by a foreign-key column. Batches many `load(key)` calls into a single grouped
 * `COUNT(*)` query and maps counts back to key order; keys with no rows resolve
 * to `0`.
 *
 * @param accessor - A service exposing `getRepository()`.
 * @param options - The grouping `column` and optional {@link GroupedCountColumnInFilter}.
 * @returns A DataLoader keyed by the column value returning a count.
 */
export function createGroupedCountLoader<TEntity extends ObjectLiteral>(
  accessor: RepositoryAccessor<TEntity>,
  { column, filter }: GroupedCountLoaderOptions<TEntity>,
): DataLoader<string, number> {
  return new DataLoader<string, number>(async (keys) => {
    if (keys.length === 0) return [];

    const ids = [...new Set(keys)];
    const alias = 'entity';
    let qb = accessor
      .getRepository()
      .createQueryBuilder(alias)
      .select(`${alias}.${column}`, 'key')
      .addSelect('COUNT(*)', 'count')
      .where(`${alias}.${column} IN (:...ids)`, { ids });

    if (filter != null && filter.values.length > 0) {
      qb = qb.andWhere(`${alias}.${filter.column} IN (:...filterValues)`, {
        filterValues: [...filter.values],
      });
    }

    const rows = await qb
      .groupBy(`${alias}.${column}`)
      .getRawMany<{ count: string; key: string }>();

    const countByKey = new Map<string, number>();
    for (const row of rows) {
      countByKey.set(row.key, Number(row.count));
    }

    return keys.map((key) => countByKey.get(key) ?? 0);
  });
}
