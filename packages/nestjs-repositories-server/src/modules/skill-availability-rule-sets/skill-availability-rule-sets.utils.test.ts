import { NotFoundException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';

import { createSkillAvailabilityRuleSetsRepositoryMock } from './skill-availability-rule-sets.utils.ts';

describe('createSkillAvailabilityRuleSetsRepositoryMock', () => {
  it('starts with no rule sets', async () => {
    const repository = createSkillAvailabilityRuleSetsRepositoryMock();

    await expect(repository.findBy()).resolves.toEqual([]);
    await expect(repository.findByProjectId('p')).resolves.toBeNull();
    await expect(repository.removeForProject('p')).resolves.toBe(false);
  });

  it('echoes the requested project and posture back', async () => {
    const repository = createSkillAvailabilityRuleSetsRepositoryMock();

    await expect(repository.upsertPosture('p', 'deny')).resolves.toMatchObject({
      posture: 'deny',
      projectId: 'p',
    });
    await expect(repository.ensureForProject('p')).resolves.toMatchObject({
      posture: 'allow',
      projectId: 'p',
    });
  });

  it('names the skill_availability_rule_sets table in inherited not-found errors', async () => {
    const repository = createSkillAvailabilityRuleSetsRepositoryMock();

    await expect(repository.remove('a')).rejects.toThrow(NotFoundException);
    await expect(repository.remove('a')).rejects.toThrow(
      'skill_availability_rule_sets record with ID "a" not found',
    );
  });
});
