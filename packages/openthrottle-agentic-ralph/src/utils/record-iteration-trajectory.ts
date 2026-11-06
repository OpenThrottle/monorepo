/**
 * @description Sends one Ralph iteration's run transcript to the server. Shared by the in-process
 * orchestrator and the detached `workflow-ralph` CLI so both record identically. It throws on a
 * GraphQL error like any other call; the caller (`runIterationAsync`'s capture step) owns the
 * fail-open policy, so a failed record never fails the iteration.
 */

import type { ExecuteGraphqlOptionsV2 } from '@openthrottle/nodejs-graphql';
import type { TrajectoryRecord } from '@openthrottle/openthrottle-agentic-utils';

import type { RecordAgentTrajectoryMutationVariables } from '../__generated__/graphql.ts';
import { RecordAgentTrajectoryDocument } from '../__generated__/graphql.ts';
import type { WorkflowExecuteGraphqlV2 } from '../contract/ralph-orchestrator-deps.ts';

/**
 * @description Who ran the iteration, and the transcript it produced.
 * @public
 */
export interface RecordIterationTrajectoryInput {
  readonly driver: string;
  /** The loop iteration, unique within a plan run; part of the idempotency key. */
  readonly iteration: number;
  readonly model: string | undefined;
  readonly planRunId: string;
  readonly record: TrajectoryRecord;
  readonly taskId: string | undefined;
}

/**
 * @description The `recordAgentTrajectory` variables for one iteration — shared by both transports
 * (the orchestrator's throwing client and the CLI's result-union client).
 * @public
 */
export const buildRecordAgentTrajectoryVariables = (
  input: RecordIterationTrajectoryInput,
): RecordAgentTrajectoryMutationVariables => {
  const { record } = input;
  const taskId = input.taskId?.trim();

  return {
    input: {
      driver: input.driver,
      durationMs: record.durationMs,
      exitCode: record.exitCode,
      idempotencyKey: `spawned:${input.planRunId}:${input.iteration}`,
      model: input.model ?? null,
      outcome: record.outcome,
      planRunId: input.planRunId,
      source: 'spawned',
      taskId: taskId === undefined || taskId === '' ? null : taskId,
      trajectoryJson: record.trajectoryJson,
    },
  };
};

/**
 * @description Records the iteration's trajectory against its plan run (and task, when known).
 * @public
 */
export const recordIterationTrajectory = async (
  executeGraphqlV2: WorkflowExecuteGraphqlV2,
  input: RecordIterationTrajectoryInput,
  options?: ExecuteGraphqlOptionsV2,
): Promise<void> => {
  await executeGraphqlV2(
    RecordAgentTrajectoryDocument,
    buildRecordAgentTrajectoryVariables(input),
    options,
  );
};
