import { describe, expect, it } from 'vitest';

import { createUserWorkspaceSettingsRepositoryMock } from './user-workspace-settings.utils.ts';

const userId = '11111111-1111-4111-8111-111111111111';

describe('createUserWorkspaceSettingsRepositoryMock', () => {
  it('starts as an empty table', async () => {
    const repository = createUserWorkspaceSettingsRepositoryMock();

    await expect(repository.findByUserId(userId)).resolves.toBeNull();
    await expect(repository.getOrCreateForUser(userId)).resolves.toMatchObject({
      enabledEditors: [],
      userId,
    });
  });

  it('applies a profile patch to an empty row', async () => {
    const repository = createUserWorkspaceSettingsRepositoryMock();

    await expect(
      repository.updateProfile(userId, {
        contactDisplayName: 'Matt',
        enabledEditors: ['cursor'],
      }),
    ).resolves.toMatchObject({
      contactDisplayName: 'Matt',
      contactEmail: null,
      enabledEditors: ['cursor'],
      userId,
    });
  });
});
