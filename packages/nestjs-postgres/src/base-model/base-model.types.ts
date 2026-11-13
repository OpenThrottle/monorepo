import type { BaseUuidModel } from '../base-uuid-model/base-uuid-model.entity.ts';
import type { BaseModel } from './base-model.entity.ts';

/**
 * @description Any entity a `BaseRepository` can serve: one extending `BaseModel` (`id` +
 * `deleted_at`) or `BaseUuidModel` (`uuid` + `is_deleted`).
 * @public
 */
export type PersistedModel = BaseModel | BaseUuidModel;

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
 * @description The base-owned columns of `TEntity`, whichever base it extends.
 * @public
 */
export type ModelManagedKeys<TEntity extends PersistedModel> =
  TEntity extends BaseModel ? BaseModelKeys : BaseUuidModelKeys;

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
