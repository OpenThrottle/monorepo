/**
 * @description Fishery factory for the skill_usage_outcomes entity (test fixtures).
 */

import { faker } from '@faker-js/faker';
import { Factory } from 'fishery';

import { SKILL_USAGE_SCOPES } from './skill-usage-events.entity.ts';
import type { SkillUsageOutcome } from './skill-usage-outcomes.entity.ts';
import {
  SKILL_USAGE_CAPTURE_MODELS,
  SKILL_USAGE_OUTCOMES,
} from './skill-usage-outcomes.entity.ts';

export type SkillUsageOutcomeFactoryData = Pick<
  SkillUsageOutcome,
  | 'captureModel'
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
  | 'source'
  | 'toolUseId'
>;

export const skillUsageOutcomesFactory =
  Factory.define<SkillUsageOutcomeFactoryData>(() => {
    const occurredAt = faker.date.recent();

    return {
      captureModel: SKILL_USAGE_CAPTURE_MODELS.REPORTED_V1,
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
        'ot-loop',
        'ot-plans',
      ]),
      source: 'claude-code',
      toolUseId: null,
    };
  });
