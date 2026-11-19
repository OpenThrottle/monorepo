import { NotFoundException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';

import { createRuleApplicationsRepositoryMock } from './rule-applications.utils.ts';

describe('createRuleApplicationsRepositoryMock', () => {
  it('starts with an empty ledger', async () => {
    const repository = createRuleApplicationsRepositoryMock();

    await expect(repository.findBy()).resolves.toEqual([]);
    await expect(repository.listForPlan('p')).resolves.toEqual([]);
    await expect(repository.findByRuleAndPlan('r', 'p')).resolves.toBeNull();
    await expect(
      repository.listEdgePlacementSiblings('p', 'first', []),
    ).resolves.toEqual([]);
    await expect(repository.orphanUnmatchedApplications('p', [])).resolves.toBe(
      0,
    );
  });

  it('records an applied row echoing its input', async () => {
    const repository = createRuleApplicationsRepositoryMock();

    await expect(
      repository.record({ planId: 'p', ruleId: 'r', state: 'applied' }),
    ).resolves.toMatchObject({
      planId: 'p',
      ruleId: 'r',
      state: 'applied',
      taskId: null,
    });
  });

  it('names the rule_applications table in inherited not-found errors', async () => {
    const repository = createRuleApplicationsRepositoryMock();

    await expect(repository.remove('a')).rejects.toThrow(NotFoundException);
    await expect(repository.remove('a')).rejects.toThrow(
      'rule_applications record with ID "a" not found',
    );
  });
});
