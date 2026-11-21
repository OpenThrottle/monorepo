import type { DeepMocked } from '@golevelup/ts-vitest';
import type { DeepPartial, ObjectLiteral, SelectQueryBuilder } from 'typeorm';
import type { Mock } from 'vitest';

import type {
  PersistedModel,
  UpdateModelInput,
} from '../base-model/base-model.types.ts';
import type { BaseRepository } from '../base-repository/base-repository.repository.ts';

/**
 * @description The public methods every `BaseRepository` subclass inherits.
 * @public
 */
export type BaseRepositoryMethod =
  | 'create'
  | 'createMany'
  | 'findBy'
  | 'findById'
  | 'findByPaginated'
  | 'findOne'
  | 'remove'
  | 'removeMany'
  | 'update'
  | 'updateMany'
  | 'updateManyReturning';

/**
 * @description A `vi.fn()` per inherited `BaseRepository` method, typed with
 * the real signature. A repository with custom methods declares an interface
 * that extends this one and adds them.
 * @public
 */
export type BaseRepositoryMock<
  TEntity extends PersistedModel,
  TCreateInput extends DeepPartial<TEntity> = DeepPartial<TEntity>,
  TUpdateInput extends object = UpdateModelInput<TEntity>,
> = {
  readonly [TMethod in BaseRepositoryMethod]: Mock<
    BaseRepository<TEntity, TCreateInput, TUpdateInput>[TMethod]
  >;
};

/**
 * @description A `SelectQueryBuilder<TEntity>` whose methods are all `vi.fn`
 * mocks typed with the real signatures, so the value can be handed to code
 * that expects a query builder and still be asserted with
 * `toHaveBeenCalledWith` or re-stubbed with `mockResolvedValue`.
 * @public
 */
export type QueryBuilderMock<TEntity extends ObjectLiteral> = DeepMocked<
  SelectQueryBuilder<TEntity>
>;

/**
 * @description Initial results for the terminal methods of a
 * {@link QueryBuilderMock}; anything left out keeps its empty default.
 * @public
 */
export interface QueryBuilderMockOptions<TEntity extends ObjectLiteral> {
  readonly count?: number;
  readonly execute?: unknown;
  readonly many?: readonly TEntity[];
  readonly manyAndCount?: readonly [readonly TEntity[], number];
  readonly one?: TEntity | null;
  readonly rawMany?: readonly unknown[];
  readonly rawOne?: unknown;
}
