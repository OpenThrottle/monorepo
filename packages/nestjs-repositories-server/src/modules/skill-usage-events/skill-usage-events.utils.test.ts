import { NotFoundException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';

import { createSkillUsageEventsRepositoryMock } from './skill-usage-events.utils.ts';

describe('createSkillUsageEventsRepositoryMock', () => {
  it('starts as an empty skill_usage_events table', async () => {
    const repository = createSkillUsageEventsRepositoryMock();
    const query = { end: '2026-01-31', start: '2026-01-01' };

    await expect(repository.listBySkill(query)).resolves.toEqual([]);
    await expect(repository.listByScope(query)).resolves.toEqual([]);
    await expect(repository.listByDay(query)).resolves.toEqual([]);
    await expect(repository.countInRange(query)).resolves.toBe(0);
    await expect(repository.listCaptureHealth()).resolves.toEqual([]);
    await expect(repository.searchGitBranches(query)).resolves.toEqual({
      hasMore: false,
      items: [],
    });
    await expect(repository.getUsageAggregation(query)).resolves.toMatchObject({
      totalCount: 0,
    });
  });

  it('rejects recordSkillUsage until a test stubs it', async () => {
    const repository = createSkillUsageEventsRepositoryMock();

    await expect(
      repository.recordSkillUsage({
        occurredAt: new Date('2026-01-15T12:00:00.000Z'),
        scope: 'ours',
        skillName: 'ot-plans',
      }),
    ).rejects.toThrow(
      'skill_usage_events.recordSkillUsage is not stubbed in this test',
    );
  });

  it('names the skill_usage_events table in inherited not-found errors', async () => {
    const repository = createSkillUsageEventsRepositoryMock();

    await expect(repository.findById('a')).rejects.toThrow(NotFoundException);
    await expect(repository.findById('a')).rejects.toThrow(
      'skill_usage_events record with ID "a" not found',
    );
  });
});
