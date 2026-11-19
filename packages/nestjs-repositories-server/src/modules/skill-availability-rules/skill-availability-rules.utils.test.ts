import { NotFoundException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';

import { createSkillAvailabilityRulesRepositoryMock } from './skill-availability-rules.utils.ts';

describe('createSkillAvailabilityRulesRepositoryMock', () => {
  it('starts with no rules', async () => {
    const repository = createSkillAvailabilityRulesRepositoryMock();

    await expect(repository.findBy()).resolves.toEqual([]);
    await expect(repository.findRuleById('r')).resolves.toBeNull();
    await expect(repository.listByRuleSetId('s')).resolves.toEqual([]);
    await expect(repository.removeRule('r')).resolves.toBe(false);
  });

  it('names the skill_availability_rules table in inherited not-found errors', async () => {
    const repository = createSkillAvailabilityRulesRepositoryMock();

    await expect(repository.remove('a')).rejects.toThrow(NotFoundException);
    await expect(repository.remove('a')).rejects.toThrow(
      'skill_availability_rules record with ID "a" not found',
    );
  });
});
