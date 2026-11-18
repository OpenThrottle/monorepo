import type { DeepPartial } from 'typeorm';
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
