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
  SkillUsageGitBranchRow,
  SkillUsageGitBranchSearchResult,
  SkillUsageOutcome,
} from '@openthrottle/nestjs-repositories';
import {
  SkillUsageByDayObject,
  SkillUsageByScopeObject,
  SkillUsageBySkillObject,
  SkillUsageEventObject,
  SkillUsageFilterOptionsObject,
  SkillUsageGitBranchObject,
  SkillUsageGitBranchSearchObject,
  SkillUsageOutcomeObject,
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
  object.source = row.source;
  object.toolUseId = row.toolUseId;

  return object;
};

export const toSkillUsageOutcomeObject = (
  row: SkillUsageOutcome,
): SkillUsageOutcomeObject => {
  const object = new SkillUsageOutcomeObject();

  object.cwd = row.cwd;
  object.durationMs = row.durationMs;
  object.gitBranch = row.gitBranch;
  object.id = row.id;
  object.occurredAt = row.occurredAt;
  object.outcome = row.outcome;
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

  object.abandonedCount = row.abandonedCount;
  object.avgDurationMs = row.avgDurationMs;
  object.count = row.count;
  object.errorCount = row.errorCount;
  object.lastUsedAt = row.lastUsedAt;
  object.outcomeCount = row.outcomeCount;
  object.scope = row.scope;
  object.skillName = row.skillName;
  object.successCount = row.successCount;

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

const toSkillUsageGitBranchObject = (
  row: SkillUsageGitBranchRow,
): SkillUsageGitBranchObject => {
  const object = new SkillUsageGitBranchObject();

  object.branch = row.branch;
  object.count = row.count;

  return object;
};

export const toSkillUsageGitBranchSearchObject = (
  result: SkillUsageGitBranchSearchResult,
): SkillUsageGitBranchSearchObject => {
  const object = new SkillUsageGitBranchSearchObject();

  object.hasMore = result.hasMore;
  object.items = result.items.map(toSkillUsageGitBranchObject);

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
