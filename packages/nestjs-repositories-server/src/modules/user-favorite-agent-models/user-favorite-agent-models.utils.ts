import type { CreateModelInput } from '@openthrottle/nestjs-postgres';
import { createBaseRepositoryMock } from '@openthrottle/nestjs-postgres/testing';
import { vi } from 'vitest';

import type { UserFavoriteAgentModel } from './user-favorite-agent-model.entity.ts';
import type { UserFavoriteAgentModelsRepositoryMock } from './user-favorite-agent-models.types.ts';

/**
 * @description Builds a {@link UserFavoriteAgentModelsRepositoryMock} that starts as an empty
 * `user_favorite_agent_models` table (see `createBaseRepositoryMock`): nothing is favorited, and
 * `setModelFavorite` is a no-op. Provide it in place of `UserFavoriteAgentModelsRepository` and
 * stub per test. Test-only: imports `vitest`.
 * @public
 */
export function createUserFavoriteAgentModelsRepositoryMock(): UserFavoriteAgentModelsRepositoryMock {
  return {
    ...createBaseRepositoryMock<
      UserFavoriteAgentModel,
      CreateModelInput<UserFavoriteAgentModel>
    >('user_favorite_agent_models'),
    getFavoriteModels: vi.fn(async () => {
      return new Map<string, ReadonlySet<string>>();
    }),
    isFavoriteModel: vi.fn(async () => {
      return false;
    }),
    setModelFavorite: vi.fn(async () => {}),
  };
}
