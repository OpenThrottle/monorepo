import { AppendPlanOutputDocument } from '@openthrottle/openthrottle-agentic-ralph';

import type {
  OtLoopExecuteGraphql,
  PlanOutputWriter,
} from './ot-loop.types.ts';

/**
 * @description A `PlanOutputWriter` over `appendPlanOutput`. Writes run strictly one after another
 * (a promise chain), so batches from the worker, the validator and the loop's own narration reach
 * plan output in the order they were produced. A failed write is dropped: output is best effort and
 * must never fail a run.
 */
export const createPlanOutputWriter = (options: {
  readonly executeGraphqlV2: OtLoopExecuteGraphql;
  readonly planId: string;
}): PlanOutputWriter => {
  const { executeGraphqlV2, planId } = options;
  let tail: Promise<void> = Promise.resolve();

  return {
    settled: () => tail,
    write: ({ attempt, kind, taskId, text }) => {
      tail = tail.then(async () => {
        try {
          await executeGraphqlV2(AppendPlanOutputDocument, {
            input: {
              content: text,
              ...(attempt !== undefined ? { iteration: attempt } : {}),
              kind,
              planId,
              ...(taskId !== undefined ? { taskId } : {}),
            },
          });
        } catch {
          // Output is best effort.
        }
      });
    },
  };
};
