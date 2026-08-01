/**
 * @description Maps SkillUsageEvent entity → SkillUsageEventObject.
 */

import type { SkillUsageEvent } from '@openthrottle/nestjs-repositories';
import { SkillUsageEventObject } from './skill-usage.object';

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
