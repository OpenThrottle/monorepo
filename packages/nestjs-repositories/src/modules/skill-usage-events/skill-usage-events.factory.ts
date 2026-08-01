/**
 * @description Fishery factory for the skill_usage_events entity (test fixtures).
 */

import { Factory } from 'fishery';
import { faker } from '@faker-js/faker';
import type { SkillUsageEvent } from './skill-usage-events.entity';
import {
  SKILL_USAGE_PRIVACY_LEVELS,
  SKILL_USAGE_SCOPES,
} from './skill-usage-events.entity';

export type SkillUsageEventFactoryData = Pick<
  SkillUsageEvent,
  | 'agentId'
  | 'agentType'
  | 'args'
  | 'cwd'
  | 'gitBranch'
  | 'hookEventName'
  | 'id'
  | 'invocationPath'
  | 'occurredAt'
  | 'privacyLevel'
  | 'promptId'
  | 'receivedAt'
  | 'scope'
  | 'sessionId'
  | 'skillName'
  | 'source'
  | 'toolUseId'
>;

export const skillUsageEventsFactory =
  Factory.define<SkillUsageEventFactoryData>(() => {
    const occurredAt = faker.date.recent();

    return {
      agentId: null,
      agentType: null,
      args: faker.lorem.sentence().slice(0, 80),
      cwd: faker.system.directoryPath(),
      gitBranch: faker.git.branch(),
      hookEventName: 'PreToolUse',
      id: faker.string.uuid(),
      invocationPath: 'skill_tool',
      occurredAt,
      privacyLevel: SKILL_USAGE_PRIVACY_LEVELS.TRUNCATED,
      promptId: null,
      receivedAt: occurredAt,
      scope: faker.helpers.arrayElement([
        SKILL_USAGE_SCOPES.OURS,
        SKILL_USAGE_SCOPES.THIRD_PARTY,
      ]),
      sessionId: faker.string.uuid(),
      skillName: faker.helpers.arrayElement([
        'ot-plans',
        'git-commit',
        'vercel:deploy',
        'engineering:code-review',
      ]),
      source: faker.helpers.arrayElement(['claude-code', 'cursor']),
      toolUseId: null,
    };
  });
