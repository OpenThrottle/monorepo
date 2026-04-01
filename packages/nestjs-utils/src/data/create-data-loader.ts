// FIXME: Swap out eventually
/* eslint-disable @typescript-eslint/consistent-type-assertions */

/**
 * @description Factory and helpers for creating DataLoader instances (batch + per-request cache) for use in NestJS GraphQL resolvers.
 */

import DataLoader from 'dataloader';

/**
 * Batch load function that returns one value per key; use null for missing keys.
 * Result array must match the order and length of the keys array.
 */
export type BatchLoadFn<K, V> = (
  keys: ReadonlyArray<K>,
) => Promise<Array<V | null>>;

/**
 * Options for {@link createDataLoader}. Pass-through to DataLoader constructor; cache is enabled by default for per-request deduplication.
 */
export type CreateDataLoaderOptions<K, V, C = K> = Omit<
  DataLoader.Options<K, V | null, C>,
  'batchLoadFn'
>;

/**
 * Creates a DataLoader that batches loads and caches results per instance.
 * Create one instance per GraphQL request (e.g. request-scoped Nest provider) to avoid cross-request cache leakage.
 *
 * @param batchLoadFn - Given an array of keys, returns a promise of values in the same order; use null for missing keys.
 * @param options - Optional DataLoader options (e.g. maxBatchSize, cacheKeyFn).
 * @returns A DataLoader instance.
 */
export function createDataLoader<K, V>(
  batchLoadFn: BatchLoadFn<K, V>,
  options?: CreateDataLoaderOptions<K, V | null>,
): DataLoader<K, V | null> {
  const fn: DataLoader.BatchLoadFn<K, V | null> = (keys) =>
    batchLoadFn(keys) as Promise<ArrayLike<(V | null) | Error>>;
  return new DataLoader(fn, options as DataLoader.Options<K, V | null, K>);
}

/**
 * Options for {@link createLoaderFromFindByIds}.
 */
export interface CreateLoaderFromFindByIdsOptions<TId, TEntity> {
  /**
   * Function that returns the entity's id (used to map results back to key order).
   * @default (entity) => (entity as { id: TId }).id
   */
  readonly keyFn?: (entity: TEntity) => TId;
}

/**
 * Creates a DataLoader from a find-by-ids style function (e.g. repository findByIds).
 * The loader batches multiple load(key) calls into one findByIds(keys) call and maps results back to key order.
 *
 * @param findByIds - Given an array of ids, returns entities (any order); missing ids can be omitted or returned as null in a parallel array.
 * @param options - Optional keyFn to extract id from entity.
 * @returns A DataLoader that loads by id and returns TEntity | null.
 */
export function createLoaderFromFindByIds<TId, TEntity>(
  findByIds: (
    ids: ReadonlyArray<TId>,
  ) => Promise<ReadonlyArray<TEntity | null>>,
  options?: CreateLoaderFromFindByIdsOptions<TId, TEntity>,
): DataLoader<TId, TEntity | null> {
  const keyFn = options?.keyFn ?? ((e: TEntity) => (e as { id: TId }).id);

  const batchLoadFn: BatchLoadFn<TId, TEntity> = async (keys) => {
    const results = await findByIds(keys);
    const resultMap = new Map<TId, TEntity | null>();
    for (const r of results) {
      if (r != null) {
        resultMap.set(keyFn(r), r);
      }
    }
    return keys.map((k) => resultMap.get(k) ?? null);
  };

  return createDataLoader(batchLoadFn);
}
