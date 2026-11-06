/**
 * @description Maps the EvalHumanLabel entity to the GraphQL AgentTrajectoryLabelObject.
 */

import type { EvalHumanLabel } from '@openthrottle/nestjs-repositories';

import type { AgentTrajectoryLabelObject } from './agent-trajectory-label.object.ts';

export const toAgentTrajectoryLabelObject = (
  row: EvalHumanLabel,
): AgentTrajectoryLabelObject => {
  return {
    createdAt: row.createdAt,
    failureType: row.failureType,
    id: row.id,
    note: row.note,
    rater: row.rater,
    trajectoryId: row.trajectoryId,
    updatedAt: row.updatedAt,
    verdict: row.verdict,
  };
};
