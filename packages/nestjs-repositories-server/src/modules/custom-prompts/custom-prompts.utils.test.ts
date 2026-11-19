import { NotFoundException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';

import { createCustomPromptsRepositoryMock } from './custom-prompts.utils.ts';

describe('createCustomPromptsRepositoryMock', () => {
  it('starts with no custom prompts', async () => {
    const repository = createCustomPromptsRepositoryMock();

    await expect(repository.findBy()).resolves.toEqual([]);
    await expect(
      repository.listFiltered({
        includeDeleted: false,
        labels: null,
        projectId: null,
        promptType: null,
        search: null,
        userId: null,
      }),
    ).resolves.toEqual([]);
    await expect(repository.findIncludingDeleted('a')).resolves.toBeNull();
    await expect(repository.restoreById('a')).resolves.toBeNull();
    await expect(repository.softDeleteById('a')).resolves.toBe(false);
    await expect(repository.hardDeleteById('a')).resolves.toBe(false);
  });

  it('names the custom_prompts table in inherited not-found errors', async () => {
    const repository = createCustomPromptsRepositoryMock();

    await expect(repository.remove('a')).rejects.toThrow(NotFoundException);
    await expect(repository.remove('a')).rejects.toThrow(
      'custom_prompts record with ID "a" not found',
    );
  });
});
