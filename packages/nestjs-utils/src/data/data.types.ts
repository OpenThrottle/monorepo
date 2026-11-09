import type DataLoader from 'dataloader';
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
 * Options for {@link createLoaderFromFindByIds}.
 */
export interface CreateLoaderFromFindByIdsOptions<TId, TEntity> {
  /**
   * Function that returns the entity's id (used to map results back to key order).
   * Required when entities are not keyed by a plain `id` field.
   */
  readonly keyFn: (entity: TEntity) => TId;
}
