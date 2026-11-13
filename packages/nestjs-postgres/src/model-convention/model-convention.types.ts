/**
 * @description How a model's primary key is named. `id` is a uuidv7 (chronological);
 * `uuid` is whatever the table's default generates (e.g. `gen_random_uuid()`, not
 * chronological).
 * @public
 */
export type ModelKeyProperty = 'id' | 'uuid';

/**
 * @description Soft delete by a nullable `deleted_at` timestamp (TypeORM
 * `@DeleteDateColumn`).
 * @public
 */
export interface TimestampSoftDelete {
  readonly kind: 'timestamp';
  readonly property: 'deletedAt';
}

/**
 * @description Soft delete by an `is_deleted` boolean flag. The column may be nullable, so
 * `NULL` reads as live.
 * @public
 */
export interface FlagSoftDelete {
  readonly kind: 'flag';
  readonly property: 'isDeleted';
}

/**
 * @description Which soft-delete mechanism a model uses.
 * @public
 */
export type SoftDeleteConvention = FlagSoftDelete | TimestampSoftDelete;

/**
 * @description The key and soft-delete conventions a `BaseRepository` threads through its
 * where, order and select builders. Each model base class declares one as its static
 * `modelConvention`.
 * @public
 */
export interface ModelConvention {
  readonly key: ModelKeyProperty;
  readonly softDelete: SoftDeleteConvention;
}
