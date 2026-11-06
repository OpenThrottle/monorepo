/**
 * @description The task page's Trajectories tab data, hoisted out of the
 * plans.$planId.tasks.$taskId._index loader.
 */
import { executeGraphqlWithAuth } from '@openthrottle/react-router-graphql';
import { FEATURE_DELTA_PREVIEW } from '@openthrottle/react-router-utils';

import type { AgentTrajectorySummaryFragment } from '~/__generated__/graphql';
import { TaskAgentTrajectoriesDocument } from '~/__generated__/graphql';

/**
 * @description A task's recorded runs (summary columns only, server order).
 * Empty without a query while `FEATURE_DELTA_PREVIEW` is off or there is no
 * task, and degrades to empty on failure: the tab is a preview surface, so a
 * trajectory error must not take the task page down with it.
 */
export const loadTaskTrajectories = async (
  request: Request,
  taskId: string | null,
): Promise<readonly AgentTrajectorySummaryFragment[]> => {
  if (!FEATURE_DELTA_PREVIEW || taskId === null) {
    return [];
  }

  try {
    const data = await executeGraphqlWithAuth(
      request,
      TaskAgentTrajectoriesDocument,
      { taskId },
    );

    return data.agentTrajectoriesByTask;
  } catch {
    return [];
  }
};
