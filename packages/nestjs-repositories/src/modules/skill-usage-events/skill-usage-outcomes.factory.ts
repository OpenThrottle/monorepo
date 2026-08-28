/**
 * @description Fishery factory for the skill_usage_outcomes entity (test fixtures).
 */

import { Factory } from 'fishery';
import { faker } from '@faker-js/faker';
import { SKILL_USAGE_SCOPES } from './skill-usage-events.entity';
import type { SkillUsageOutcome } from './skill-usage-outcomes.entity';
import { SKILL_USAGE_OUTCOMES } from './skill-usage-outcomes.entity';

export type SkillUsageOutcomeFactoryData = Pick<
  SkillUsageOutcome,
  | 'cwd'
  | 'durationMs'
  | 'gitBranch'
  | 'id'
  | 'occurredAt'
  | 'outcome'
  | 'receivedAt'
  | 'scope'
  | 'sessionId'
  | 'skillName'
  | 'toolUseId'
>;

export const skillUsageOutcomesFactory =
  Factory.define<SkillUsageOutcomeFactoryData>(() => {
    const occurredAt = faker.date.recent();

    return {
      cwd: faker.system.directoryPath(),
      durationMs: faker.number.int({ max: 120_000, min: 50 }),
      gitBranch: faker.git.branch(),
      id: faker.string.uuid(),
      occurredAt,
      outcome: faker.helpers.arrayElement([
        SKILL_USAGE_OUTCOMES.ABANDONED,
        SKILL_USAGE_OUTCOMES.ERROR,
        SKILL_USAGE_OUTCOMES.SUCCESS,
      ]),
      receivedAt: occurredAt,
      scope: SKILL_USAGE_SCOPES.OURS,
      sessionId: faker.string.uuid(),
      skillName: faker.helpers.arrayElement([
        'github-commit',
        'ot-claude-loop',
        'ot-plans',
      ]),
      toolUseId: null,
    };
  });
