import type { ModelConvention } from './model-convention.types.ts';

/**
 * @description The `BaseHardDeleteModel` convention: a uuidv7 `id` key and no soft delete,
 * so deletes are real. The `openthrottle` shape for append-only, log and derived rows.
 * @public
 */
export const ID_HARD_DELETE_MODEL_CONVENTION: ModelConvention = {
  key: 'id',
  softDelete: { kind: 'none' },
};

/**
 * @description The `BaseModel` convention: a uuidv7 `id` key and a `deleted_at` timestamp.
 * The shape the `openthrottle` database adopts.
 * @public
 */
export const ID_TIMESTAMP_MODEL_CONVENTION: ModelConvention = {
  key: 'id',
  softDelete: { kind: 'timestamp', property: 'deletedAt' },
};

/**
 * @description The `BaseUuidModel` convention: a `uuid` key and a nullable `is_deleted`
 * flag. The shape the `cms` database uses.
 * @public
 */
export const UUID_FLAG_MODEL_CONVENTION: ModelConvention = {
  key: 'uuid',
  softDelete: { kind: 'flag', property: 'isDeleted' },
};
