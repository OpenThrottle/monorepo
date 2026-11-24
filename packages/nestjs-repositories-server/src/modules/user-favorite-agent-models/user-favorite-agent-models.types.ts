import type { CreateModelInput } from '@openthrottle/nestjs-postgres';
import type { BaseRepositoryMock } from '@openthrottle/nestjs-postgres/testing';
import type { Mock } from 'vitest';

import type { UserFavoriteAgentModel } from './user-favorite-agent-model.entity.ts';
import type { UserFavoriteAgentModelsRepository } from './user-favorite-agent-models.repository.ts';

/**
 * Scalar/column fields of {@link UserFavoriteAgentModel} (no relations).
 * @public
 */
export type UserFavoriteAgentModelData = Pick<
  UserFavoriteAgentModel,
  'driver' | 'createdAt' | 'id' | 'model' | 'userId'
>;

/**
 * @description A {@link UserFavoriteAgentModelsRepository} mock: every inherited
 * `BaseRepository` method plus the favorite ones.
 * @public
 */
export interface UserFavoriteAgentModelsRepositoryMock extends BaseRepositoryMock<
  UserFavoriteAgentModel,
  CreateModelInput<UserFavoriteAgentModel>
> {
  readonly getFavoriteModels: Mock<
    UserFavoriteAgentModelsRepository['getFavoriteModels']
  >;
  readonly isFavoriteModel: Mock<
    UserFavoriteAgentModelsRepository['isFavoriteModel']
  >;
  readonly setModelFavorite: Mock<
    UserFavoriteAgentModelsRepository['setModelFavorite']
  >;
}
