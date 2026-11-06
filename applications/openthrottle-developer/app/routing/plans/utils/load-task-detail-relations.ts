/**
 * @description Everything the task detail page loads once it has the task,
 * hoisted out of the plans.$planId.tasks.$taskId._index loader so the route
 * module stays thin.
 */
import { executeGraphqlWithAuth } from '@openthrottle/react-router-graphql';

import type {
  AgentTrajectorySummaryFragment,
  GetPlanByIdQuery,
  TaskDetailsFragment,
  TaskLinkedArtifactsQuery,
  TaskOutputStreamChunksQuery,
} from '~/__generated__/graphql';
import {
  GetPlanByIdDocument,
  TaskLinkedArtifactsDocument,
  TaskOutputStreamChunksDocument,
} from '~/__generated__/graphql';
import { loadTaskTrajectories } from '~/routing/evals/utils/load-task-trajectories';

export interface TaskDetailRelations {
  readonly linkedArtifacts: TaskLinkedArtifactsQuery['workArtifactsByTask']['artifacts'];
  readonly plan: NonNullable<GetPlanByIdQuery['plan']> | null;
  readonly planOutputChunks: TaskOutputStreamChunksQuery['planOutputStreamChunks'];
  readonly trajectories: readonly AgentTrajectorySummaryFragment[];
}

/**
 * @description Loads the task's plan, linked artifacts, output chunks and
 * (behind `FEATURE_DELTA_PREVIEW`) recorded trajectories.
 *
 * Each depends only on the task already fetched — never on each other — so
 * they issue together instead of stacking more round-trips behind the first.
 * The server filters output chunks by both planId and taskId.
 */
export const loadTaskDetailRelations = async (
  request: Request,
  task: TaskDetailsFragment | null,
  taskId: string,
): Promise<TaskDetailRelations> => {
  const taskPlanId = task?.planId;

  const fetchPlan = async () => {
    if (taskPlanId == null) {
      return null;
    }

    return executeGraphqlWithAuth(request, GetPlanByIdDocument, {
      id: taskPlanId,
    });
  };

  const fetchLinkedArtifacts = async () => {
    if (task == null) {
      return null;
    }

    return executeGraphqlWithAuth(request, TaskLinkedArtifactsDocument, {
      taskId,
    });
  };

  const fetchPlanOutputChunks = async () => {
    if (taskPlanId == null) {
      return null;
    }

    return executeGraphqlWithAuth(request, TaskOutputStreamChunksDocument, {
      planId: taskPlanId,
      taskId,
    });
  };

  const [
    planResult,
    linkedArtifactsResult,
    planOutputChunksResult,
    trajectories,
  ] = await Promise.all([
    fetchPlan(),
    fetchLinkedArtifacts(),
    fetchPlanOutputChunks(),
    loadTaskTrajectories(request, task == null ? null : taskId),
  ]);

  return {
    linkedArtifacts: linkedArtifactsResult?.workArtifactsByTask.artifacts ?? [],
    plan: planResult?.plan ?? null,
    planOutputChunks: planOutputChunksResult?.planOutputStreamChunks ?? [],
    trajectories,
  };
};
