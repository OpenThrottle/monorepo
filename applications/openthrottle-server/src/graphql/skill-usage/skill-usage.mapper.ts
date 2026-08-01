/**
 * @description Maps skill-usage entity / aggregation rows → GraphQL objects.
 */

import type {
  SkillUsageAggregation,
  SkillUsageByDayRow,
  SkillUsageByScopeRow,
  SkillUsageBySkillRow,
  SkillUsageEvent,
  SkillUsageFilterOptions,
} from '@openthrottle/nestjs-repositories';
import {
  SkillUsageByDayObject,
  SkillUsageByScopeObject,
  SkillUsageBySkillObject,
  SkillUsageEventObject,
  SkillUsageFilterOptionsObject,
  SkillUsageResultObject,
} from './skill-usage.object';

export const toSkillUsageEventObject = (
  row: SkillUsageEvent,
): SkillUsageEventObject => {
  const object = new SkillUsageEventObject();

  object.agentId = row.agentId;
  object.agentType = row.agentType;
  object.args = row.args;
  object.cwd = row.cwd;
  object.gitBranch = row.gitBranch;
  object.hookEventName = row.hookEventName;
  object.id = row.id;
  object.invocationPath = row.invocationPath;
  object.occurredAt = row.occurredAt;
  object.privacyLevel = row.privacyLevel;
  object.promptId = row.promptId;
  object.receivedAt = row.receivedAt;
  object.scope = row.scope;
  object.sessionId = row.sessionId;
  object.skillName = row.skillName;
  object.toolUseId = row.toolUseId;

  return object;
};

export const toSkillUsageBySkillObject = (
  row: SkillUsageBySkillRow,
): SkillUsageBySkillObject => {
  const object = new SkillUsageBySkillObject();

  object.count = row.count;
  object.scope = row.scope;
  object.skillName = row.skillName;

  return object;
};

export const toSkillUsageByScopeObject = (
  row: SkillUsageByScopeRow,
): SkillUsageByScopeObject => {
  const object = new SkillUsageByScopeObject();

  object.count = row.count;
  object.scope = row.scope;

  return object;
};

export const toSkillUsageByDayObject = (
  row: SkillUsageByDayRow,
): SkillUsageByDayObject => {
  const object = new SkillUsageByDayObject();

  object.date = row.date;
  object.oursCount = row.oursCount;
  object.thirdPartyCount = row.thirdPartyCount;
  object.totalCount = row.totalCount;

  return object;
};

export const toSkillUsageFilterOptionsObject = (
  options: SkillUsageFilterOptions,
): SkillUsageFilterOptionsObject => {
  const object = new SkillUsageFilterOptionsObject();

  object.cwds = [...options.cwds];
  object.gitBranches = [...options.gitBranches];

  return object;
};

export const toSkillUsageResultObject = (
  aggregation: SkillUsageAggregation,
): SkillUsageResultObject => {
  const result = new SkillUsageResultObject();

  result.byDay = aggregation.byDay.map(toSkillUsageByDayObject);
  result.byScope = aggregation.byScope.map(toSkillUsageByScopeObject);
  result.bySkill = aggregation.bySkill.map(toSkillUsageBySkillObject);
  result.filterOptions = toSkillUsageFilterOptionsObject(
    aggregation.filterOptions,
  );
  result.totalCount = aggregation.totalCount;

  return result;
};
