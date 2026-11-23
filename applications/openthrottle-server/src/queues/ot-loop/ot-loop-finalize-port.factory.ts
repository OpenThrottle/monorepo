import type {
  PlanRunFinalizePort,
  PlanRunFinalizeTaskRow,
} from '@openthrottle/openthrottle-agentic-loop';

import {
  AppendPlanOutputDocument,
  GetPlanDocument,
  GetTasksByPlanIdDocument,
} from '../../__generated__/graphql.ts';
import type { OtLoopExecuteGraphql } from './ot-loop.types.ts';

/**
 * @description The finish step's `PlanRunFinalizePort` over the worker-scoped GraphQL executor:
 * `appendPlanOutput` for the step's narration and owed-step lines, `getPlan` and `getTasksByPlanId`
 * for the PR title and body. It only forwards; the loop package owns the best-effort handling, so
 * a rejected call here is caught there and never fails the run.
 */
export const createOtLoopFinalizePort = (options: {
  readonly executeGraphqlV2: OtLoopExecuteGraphql;
}): PlanRunFinalizePort => {
  const { executeGraphqlV2 } = options;

  return {
    appendOutput: async ({ content, planId }) => {
      await executeGraphqlV2(AppendPlanOutputDocument, {
        input: { content, planId },
      });
    },
    readPlan: async (planId) => {
      const result = await executeGraphqlV2(GetPlanDocument, { id: planId });

      return result.plan;
    },
    readTasks: async (planId) => {
      const result = await executeGraphqlV2(GetTasksByPlanIdDocument, {
        input: { planId },
      });
      const rows: readonly PlanRunFinalizeTaskRow[] = result.tasksByPlanId;

      return rows;
    },
  };
};
