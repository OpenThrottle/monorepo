import type { CreateModelInput } from '@openthrottle/nestjs-postgres';
import { createBaseRepositoryMock } from '@openthrottle/nestjs-postgres/testing';
import { vi } from 'vitest';

import type { RuleApplication } from './rule-application.entity.ts';
import type { RuleApplicationsRepositoryMock } from './rule-applications.types.ts';

/**
 * @description Builds a {@link RuleApplicationsRepositoryMock} that starts as an empty
 * `rule_applications` table (see `createBaseRepositoryMock`): nothing is listed or found,
 * nothing is orphaned, and `record` resolves with a stored-looking applied row. Provide it in
 * place of `RuleApplicationsRepository` and stub per test. Test-only: imports `vitest`.
 * @public
 */
export function createRuleApplicationsRepositoryMock(): RuleApplicationsRepositoryMock {
  return {
    ...createBaseRepositoryMock<
      RuleApplication,
      CreateModelInput<RuleApplication>
    >('rule_applications'),
    findByRuleAndPlan: vi.fn(async () => {
      return null;
    }),
    listEdgePlacementSiblings: vi.fn(async () => {
      return [];
    }),
    listForPlan: vi.fn(async () => {
      return [];
    }),
    orphanUnmatchedApplications: vi.fn(async () => {
      return 0;
    }),
    record: vi.fn(async (input) => {
      const now = new Date();
      return {
        createdAt: now,
        details: input.details ?? null,
        id: 'rule-application-id',
        planId: input.planId,
        ruleId: input.ruleId,
        state: input.state,
        taskId: input.taskId ?? null,
        updatedAt: now,
      };
    }),
    upsertApplication: vi.fn(async () => {
      return undefined;
    }),
  };
}
