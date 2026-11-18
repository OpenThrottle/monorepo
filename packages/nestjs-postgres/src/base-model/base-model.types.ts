import type { BaseHardDeleteModel } from '../base-hard-delete-model/base-hard-delete-model.entity.ts';
import type { BaseUuidModel } from '../base-uuid-model/base-uuid-model.entity.ts';
import type { BaseModel } from './base-model.entity.ts';

/**
 * @description Any entity a `BaseRepository` can serve: one extending `BaseModel` (`id` +
 * `deleted_at`), `BaseUuidModel` (`uuid` + `is_deleted`) or `BaseHardDeleteModel` (`id`,
 * no soft delete).
 * @public
 */
export type PersistedModel = BaseHardDeleteModel | BaseModel | BaseUuidModel;

/**
 * @description The columns `BaseModel` owns, which callers never write directly.
 * @public
 */
export type BaseModelKeys = keyof BaseModel;

/**
 * @description The columns `BaseUuidModel` owns, which callers never write directly.
 * @public
 */
export type BaseUuidModelKeys = keyof BaseUuidModel;

/**
 * @description The columns a `BaseHardDeleteModel` table never takes from callers: the
 * base's own plus `updatedAt`, which a table that updates rows declares itself.
 * @public
 */
export type BaseHardDeleteModelKeys = keyof BaseHardDeleteModel | 'updatedAt';

/**
 * @description The base-owned columns of `TEntity`, whichever base it extends. `BaseModel`
 * is tested first because it structurally satisfies `BaseHardDeleteModel` too.
 * @public
 */
export type ModelManagedKeys<TEntity extends PersistedModel> =
  TEntity extends BaseModel
    ? BaseModelKeys
    : TEntity extends BaseUuidModel
      ? BaseUuidModelKeys
      : BaseHardDeleteModelKeys;

/**
 * @description The shape a caller supplies to create a row: the entity minus the columns
 * Postgres and TypeORM fill in.
 * @public
 */
export type CreateModelInput<TEntity extends PersistedModel> = Omit<
  TEntity,
  ModelManagedKeys<TEntity>
>;

/**
 * @description Any subset of {@link CreateModelInput}, for partial updates.
 * @public
 */
export type UpdateModelInput<TEntity extends PersistedModel> = Partial<
  CreateModelInput<TEntity>
>;
