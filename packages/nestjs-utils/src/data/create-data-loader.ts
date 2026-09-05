/**
 * @description Factory and helpers for creating DataLoader instances (batch + per-request cache) for use in NestJS GraphQL resolvers.
 */

import DataLoader from 'dataloader';

/**
 * Batch load function that returns one value per key; use null for missing keys.
 * Result array must match the order and length of the keys array.
 */
export type BatchLoadFn<TKey, TValue> = (
  keys: ReadonlyArray<TKey>,
) => Promise<Array<TValue | null>>;

/**
 * Options for {@link createDataLoader}. Pass-through to DataLoader constructor; cache is enabled by default for per-request deduplication.
 */
export type CreateDataLoaderOptions<TKey, TValue, TCacheKey = TKey> = Omit<
  DataLoader.Options<TKey, TValue | null, TCacheKey>,
  'batchLoadFn'
>;

/**
 * Creates a DataLoader that batches loads and caches results per instance.
 * Create one instance per GraphQL request (e.g. request-scoped Nest provider) to avoid cross-request cache leakage.
 *
 * @public
 * @param batchLoadFn - Given an array of keys, returns a promise of values in the same order; use null for missing keys.
 * @param options - Optional DataLoader options (e.g. maxBatchSize, cacheKeyFn).
 * @returns A DataLoader instance.
 */
export function createDataLoader<TKey, TValue>(
  batchLoadFn: BatchLoadFn<TKey, TValue>,
  options?: CreateDataLoaderOptions<TKey, TValue>,
): DataLoader<TKey, TValue | null> {
  const fn: DataLoader.BatchLoadFn<TKey, TValue | null> = (keys) =>
    batchLoadFn(keys);
  return new DataLoader(fn, options);
}

/**
 * Type guard: narrows an entity to one carrying a typed `id` field.
 * Used by the default key extractor so the field read is sound without a cast.
 */
function hasId<TId, TEntity>(
  entity: TEntity,
): entity is TEntity & { readonly id: TId } {
  return typeof entity === 'object' && entity !== null && 'id' in entity;
}

/**
 * Default key extractor used when {@link CreateLoaderFromFindByIdsOptions.keyFn}
 * is omitted. The omit-options overload constrains the entity to `{ id: TId }`,
 * so this path only runs for id-keyed entities; the {@link hasId} guard reads
 * the field without a type assertion and throws a clear error for malformed
 * input.
 */
function defaultIdKeyFn<TId, TEntity>(entity: TEntity): TId {
  if (hasId<TId, TEntity>(entity)) {
    return entity.id;
  }
  throw new TypeError(
    'createLoaderFromFindByIds: entity has no "id" field; pass options.keyFn',
  );
}

/**
 * Options for {@link createLoaderFromFindByIds}.
 */
export interface CreateLoaderFromFindByIdsOptions<TId, TEntity> {
  /**
   * Function that returns the entity's id (used to map results back to key order).
   * Required when entities are not keyed by a plain `id` field.
   */
  readonly keyFn: (entity: TEntity) => TId;
}

/**
 * Creates a DataLoader from a find-by-ids style function (e.g. repository findByIds).
 * The loader batches multiple load(key) calls into one findByIds(keys) call and maps results back to key order.
 *
 * When entities are keyed by a plain `id` field, the `options` argument may be
 * omitted and the id is read from `entity.id`. For any other key shape, pass
 * `options.keyFn` so the key is resolved with a compile-time guarantee.
 *
 * @public
 * @param findByIds - Given an array of ids, returns entities (any order); missing ids can be omitted or returned as null in a parallel array.
 * @param options - Optional keyFn to extract id from entity (required when the entity is not `{ id: TId }`).
 * @returns A DataLoader that loads by id and returns TEntity | null.
 */
export function createLoaderFromFindByIds<TId, TEntity extends { id: TId }>(
  findByIds: (
    ids: ReadonlyArray<TId>,
  ) => Promise<ReadonlyArray<TEntity | null>>,
): DataLoader<TId, TEntity | null>;
export function createLoaderFromFindByIds<TId, TEntity>(
  findByIds: (
    ids: ReadonlyArray<TId>,
  ) => Promise<ReadonlyArray<TEntity | null>>,
  options: CreateLoaderFromFindByIdsOptions<TId, TEntity>,
): DataLoader<TId, TEntity | null>;
export function createLoaderFromFindByIds<TId, TEntity>(
  findByIds: (
    ids: ReadonlyArray<TId>,
  ) => Promise<ReadonlyArray<TEntity | null>>,
  options?: CreateLoaderFromFindByIdsOptions<TId, TEntity>,
): DataLoader<TId, TEntity | null> {
  const keyFn: (entity: TEntity) => TId =
    options?.keyFn ??
    ((entity: TEntity) => defaultIdKeyFn<TId, TEntity>(entity));

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
