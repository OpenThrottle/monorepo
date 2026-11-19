import { NotFoundException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';

import { createTagActionRulesRepositoryMock } from './tag-action-rules.utils.ts';

describe('createTagActionRulesRepositoryMock', () => {
  it('starts with no tag-action rules', async () => {
    const repository = createTagActionRulesRepositoryMock();

    await expect(repository.findBy()).resolves.toEqual([]);
    await expect(repository.listForUser('u')).resolves.toEqual([]);
    await expect(repository.listEnabledForUser('u')).resolves.toEqual([]);
    await expect(repository.findForUser('u', 'r')).resolves.toBeNull();
    await expect(repository.removeForUser('u', 'r')).resolves.toBe(false);
  });

  it('names the tag_action_rules table in inherited not-found errors', async () => {
    const repository = createTagActionRulesRepositoryMock();

    await expect(repository.remove('a')).rejects.toThrow(NotFoundException);
    await expect(repository.remove('a')).rejects.toThrow(
      'tag_action_rules record with ID "a" not found',
    );
  });
});
