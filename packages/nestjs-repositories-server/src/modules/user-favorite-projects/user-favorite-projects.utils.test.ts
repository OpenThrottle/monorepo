import { describe, expect, it } from 'vitest';

import { createUserFavoriteProjectsRepositoryMock } from './user-favorite-projects.utils.ts';

const userId = '11111111-1111-4111-8111-111111111111';

describe('createUserFavoriteProjectsRepositoryMock', () => {
  it('starts as an empty table, so nothing is starred', async () => {
    const repository = createUserFavoriteProjectsRepositoryMock();

    await expect(repository.listFavoriteProjectIds(userId)).resolves.toEqual(
      [],
    );
  });
});
