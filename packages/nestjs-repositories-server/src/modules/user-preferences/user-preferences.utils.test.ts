import { describe, expect, it } from 'vitest';

import { createUserPreferencesRepositoryMock } from './user-preferences.utils.ts';

const userId = '11111111-1111-4111-8111-111111111111';

describe('createUserPreferencesRepositoryMock', () => {
  it('reads all-NULL preferences for the user', async () => {
    const repository = createUserPreferencesRepositoryMock();

    await expect(repository.getForUser(userId)).resolves.toEqual({
      defaultAgent: null,
      defaultEditor: null,
      userId,
    });
  });

  it('resolves an update as success with empty preferences', async () => {
    const repository = createUserPreferencesRepositoryMock();

    await expect(
      repository.update(userId, { defaultEditor: 'cursor' }),
    ).resolves.toEqual({
      ok: true,
      preferences: { defaultAgent: null, defaultEditor: null, userId },
    });
  });
});
