import { NotFoundException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';

import { createSkillUsageOutcomesRepositoryMock } from './skill-usage-outcomes.utils.ts';

describe('createSkillUsageOutcomesRepositoryMock', () => {
  it('rejects recordSkillUsageOutcome until a test stubs it', async () => {
    const repository = createSkillUsageOutcomesRepositoryMock();

    await expect(
      repository.recordSkillUsageOutcome({
        occurredAt: new Date('2026-01-15T12:00:00.000Z'),
        outcome: 'success',
        skillName: 'ot-plans',
      }),
    ).rejects.toThrow(
      'skill_usage_outcomes.recordSkillUsageOutcome is not stubbed in this test',
    );
  });

  it('names the skill_usage_outcomes table in inherited not-found errors', async () => {
    const repository = createSkillUsageOutcomesRepositoryMock();

    await expect(repository.findById('a')).rejects.toThrow(NotFoundException);
    await expect(repository.findById('a')).rejects.toThrow(
      'skill_usage_outcomes record with ID "a" not found',
    );
  });
});
