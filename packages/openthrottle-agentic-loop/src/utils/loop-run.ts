import { toErrorMessage } from '@openthrottle/nodejs-utils';

import {
  DEFAULT_MAX_RETRIES,
  MAX_RETRIES_CEILING,
  MAX_RETRIES_FLOOR,
} from '../data/data.constants.ts';
import { LOOP_PLAN_STATUS, LOOP_TASK_STATUS } from '../data/data.loop.ts';
import type {
  GitHeadState,
  LoopInboxMessage,
  LoopTask,
} from '../types/loop.ts';
import type { LoopRunContext } from './loop-run-context.ts';

/** @description Plan-output narration; task-scoped lines carry the tracker's attempt number; a narration failure never stops the loop. */
export const narrate = async (
  ctx: LoopRunContext,
  message: string,
  taskId: string | undefined,
): Promise<void> => {
  try {
    await ctx.deps.client.narrate({
      attempt: taskId === undefined ? undefined : ctx.tracker.attempt,
      message,
      taskId,
    });
  } catch {
    // Narration is best effort.
  }
};

/** Appends the messages not yet in the guidance list; returns the bodies it added. */
const adoptGuidance = (
  ctx: LoopRunContext,
  messages: readonly LoopInboxMessage[],
): readonly string[] => {
  const { guidanceMessageIds } = ctx.tracker;
  const fresh = messages.filter(
    (message) => !guidanceMessageIds.has(message.id),
  );

  if (fresh.length === 0) {
    return [];
  }

  const bodies = fresh.map((message) => message.body);

  fresh.forEach((message) => guidanceMessageIds.add(message.id));
  ctx.tracker.guidance = [...ctx.tracker.guidance, ...bodies];

  return bodies;
};

/** Messages delivered to this run so far; a read failure is narrated and reads as none. */
const readRunDelivered = async (
  ctx: LoopRunContext,
  taskId: string,
): Promise<readonly LoopInboxMessage[]> => {
  try {
    return await ctx.deps.client.listRunDeliveredMessages();
  } catch (error) {
    const message = toErrorMessage(error);

    await narrate(
      ctx,
      `warning: could not read the messages delivered to this run: ${message}`,
      taskId,
    );

    return [];
  }
};

/**
 * @description Claims the plan inbox once for `taskId`; claimed bodies join the run-scoped guidance
 * list for good. Called at every task boundary and again before each retry of a task, so a message
 * posted while an attempt ran reaches the next attempt rather than waiting for the next task.
 *
 * First it folds in what the in-worker hook claimed for this run mid-attempt: those messages are
 * already DELIVERED, so the claim below never returns them, yet later task prompts must still carry
 * them. Message ids keep the job's own earlier claims from being added twice.
 */
export const claimGuidance = async (
  ctx: LoopRunContext,
  taskId: string,
): Promise<void> => {
  const folded = adoptGuidance(ctx, await readRunDelivered(ctx, taskId));
  const claimed = adoptGuidance(
    ctx,
    await ctx.deps.client.claimInbox({ taskId }),
  );

  await Promise.all([
    ...folded.map((body) =>
      narrate(ctx, `operator guidance claimed in-worker: ${body}`, taskId),
    ),
    ...claimed.map((body) =>
      narrate(ctx, `operator guidance claimed: ${body}`, taskId),
    ),
  ]);
};

/** @description Ends the tracked per-task session (never the processor's run session). */
export const endTaskSession = async (ctx: LoopRunContext): Promise<void> => {
  const { sessionId } = ctx.tracker;

  if (sessionId === undefined) {
    return;
  }

  ctx.tracker.sessionId = undefined;
  await ctx.deps.client.endWorkSession(sessionId);
};

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

/**
 * @description Resolves `maxRetries`: default 2 when absent or not finite, floored to an integer
 * and clamped to 0..5.
 * @public
 */
export const clampMaxRetries = (value: number | undefined): number => {
  if (value === undefined || !Number.isFinite(value)) {
    return DEFAULT_MAX_RETRIES;
  }

  return Math.min(
    MAX_RETRIES_CEILING,
    Math.max(MAX_RETRIES_FLOOR, Math.floor(value)),
  );
};
