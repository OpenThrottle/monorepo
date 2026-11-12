import type { GitHeadState, LoopTask } from '../contract/index.ts';
import { LOOP_PLAN_STATUS, LOOP_TASK_STATUS } from '../contract/index.ts';
import type { LoopRunContext } from './loop-run-context.ts';
import { narrate } from './narrate.ts';

/**
 * @description Detection half of the worker-misbehaviour guard (docs § 2), run after every
 * attempt: restores HEAD/branch if the worker moved them, and restores the task and the plan to
 * `IN_PROGRESS` if the worker changed either. Other tasks' status changes are logged, not reverted.
 */
export const guardWorker = async (
  ctx: LoopRunContext,
  task: LoopTask,
  startHead: GitHeadState,
  boundarySnapshot: readonly LoopTask[],
): Promise<void> => {
  const { client, git } = ctx.deps;
  const head = await git.head();

  if (head.branch !== startHead.branch || head.sha !== startHead.sha) {
    await git.restoreHead(startHead);
    await narrate(
      ctx,
      `warning: worker moved HEAD (${head.branch}@${head.sha}); restored ${startHead.branch}@${startHead.sha}`,
      task.id,
    );
  }

  const after = await client.listTasks(ctx.planId);
  const current = after.find((candidate) => candidate.id === task.id);

  if (
    current !== undefined &&
    current.status !== LOOP_TASK_STATUS.IN_PROGRESS
  ) {
    await client.updateTask({
      status: LOOP_TASK_STATUS.IN_PROGRESS,
      summary: undefined,
      taskId: task.id,
    });
    await narrate(
      ctx,
      `warning: worker set this task ${current.status}; restored IN_PROGRESS`,
      task.id,
    );
  }

  const changedOthers = after.filter((candidate) => {
    const before = boundarySnapshot.find((entry) => entry.id === candidate.id);

    return (
      candidate.id !== task.id &&
      before !== undefined &&
      before.status !== candidate.status
    );
  });

  if (changedOthers.length > 0) {
    const titles = changedOthers
      .map((entry) => `"${entry.title}" ${entry.status}`)
      .join(', ');

    await narrate(
      ctx,
      `warning: other task statuses changed during the attempt (${titles}); left as is`,
      task.id,
    );
  }

  const planStatus = await client.getPlanStatus(ctx.planId);

  if (planStatus !== LOOP_PLAN_STATUS.IN_PROGRESS) {
    await client.updatePlanStatus({
      planId: ctx.planId,
      status: LOOP_PLAN_STATUS.IN_PROGRESS,
    });
    await narrate(
      ctx,
      `warning: worker set the plan ${planStatus}; restored IN_PROGRESS`,
      task.id,
    );
  }
};
