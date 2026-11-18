import { NotFoundException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';

import { createUserFavoriteAgentModelsRepositoryMock } from './user-favorite-agent-models.utils.ts';

const userId = '11111111-1111-4111-8111-111111111111';

describe('createUserFavoriteAgentModelsRepositoryMock', () => {
  it('starts as an empty table, so nothing is favorited', async () => {
    const repository = createUserFavoriteAgentModelsRepositoryMock();

    await expect(repository.getFavoriteModels(userId)).resolves.toEqual(
      new Map(),
    );
    await expect(
      repository.isFavoriteModel(userId, 'claude', 'opus'),
    ).resolves.toBe(false);
  });

  it('names the user_favorite_agent_models table in inherited not-found errors', async () => {
    const repository = createUserFavoriteAgentModelsRepositoryMock();

    await expect(repository.findById('a')).rejects.toThrow(NotFoundException);
    await expect(repository.findById('a')).rejects.toThrow(
      'user_favorite_agent_models record with ID "a" not found',
    );
  });
});
