import type { BaseModel } from './base-model.entity.ts';

/**
 * @description The columns `BaseModel` owns, which callers never write directly.
 * @public
 */
export type BaseModelKeys = keyof BaseModel;

/**
 * @description The shape a caller supplies to create a row: the entity minus the columns
 * Postgres and TypeORM fill in.
 * @public
 */
export type CreateModelInput<TEntity extends BaseModel> = Omit<
  TEntity,
  BaseModelKeys
>;

/**
 * @description Any subset of {@link CreateModelInput}, for partial updates.
 * @public
 */
export type UpdateModelInput<TEntity extends BaseModel> = Partial<
  CreateModelInput<TEntity>
>;
