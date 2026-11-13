/*
 * LOCKSTEP. skills/ot-loop/SKILL.md § "The loop (one task at a time)" is the CANONICAL statement
 * of the per-task discipline. This file is a DELIBERATE RESTATEMENT of it in code (the third, after
 * skills/agents-ralph/SKILL.md). A change to that section must land here in the same PR. Design
 * and deliberate divergences (inbox handling, thin tasks): docs/workflows/ot-loop-job.md.
 */
import type { LoopOutcome, RunOtLoopOptions } from '../contract/index.ts';
import { LOOP_TASK_STATUS } from '../contract/index.ts';
import { clampMaxRetries, endTaskSession, narrate } from './loop-run.ts';
import type { LoopRunContext } from './loop-run-context.ts';
import { runTask } from './runTask.ts';
import { closePlan, selectNextTask } from './tasks.ts';

const cancelledOutcome = async (ctx: LoopRunContext): Promise<LoopOutcome> => {
  await endTaskSession(ctx);

  return { kind: 'cancelled', taskId: undefined };
};

/** Claims the inbox once; claimed bodies join the run-scoped guidance list for good. */
const claimGuidance = async (
  ctx: LoopRunContext,
  taskId: string,
): Promise<void> => {
  const bodies = await ctx.deps.client.claimInbox({ taskId });

  if (bodies.length === 0) {
    return;
  }

  ctx.tracker.guidance = [...ctx.tracker.guidance, ...bodies];
  await Promise.all(
    bodies.map((body) =>
      narrate(ctx, `operator guidance claimed: ${body}`, taskId),
    ),
  );
};

/**
 * One boundary. Strictly sequential by nature (each task depends on the last one's flips), so it
 * recurses instead of looping around awaits.
 */
const step = async (
  ctx: LoopRunContext,
  onlyTaskId: string | undefined,
): Promise<LoopOutcome> => {
  if (await ctx.deps.cancel.isCancelled()) {
    return cancelledOutcome(ctx);
  }

  // Re-read from OT at every boundary, never cached.
  const tasks = await ctx.deps.client.listTasks(ctx.planId);
  const next = selectNextTask(tasks, onlyTaskId);

  if (next === undefined) {
    await endTaskSession(ctx);

    return closePlan(tasks, onlyTaskId, ctx.tracker.completedTaskIds);
  }

  const resumed = tasks.filter(
    (task) => task.status === LOOP_TASK_STATUS.IN_PROGRESS,
  );

  if (resumed.length > 1 && onlyTaskId === undefined) {
    await narrate(
      ctx,
      `warning: ${resumed.length} tasks were IN_PROGRESS; resuming the lowest`,
      next.id,
    );
  }

  await claimGuidance(ctx, next.id);
  // End only the previous task's session, then the next task opens its own.
  await endTaskSession(ctx);

  const taskStep = await runTask(ctx, next, tasks);

  if (taskStep.kind === 'stop') {
    return taskStep.outcome;
  }

  return step(ctx, onlyTaskId);
};

/** Every exit path flips the current task: an unexpected throw returns it to PENDING. */
const recover = async (
  ctx: LoopRunContext,
  error: unknown,
): Promise<LoopOutcome> => {
  const reason = error instanceof Error ? error.message : String(error);
  const { currentTaskId } = ctx.tracker;

  try {
    if (currentTaskId !== undefined) {
      await ctx.deps.client.updateTask({
        status: LOOP_TASK_STATUS.PENDING,
        summary: undefined,
        taskId: currentTaskId,
      });
    }

    await endTaskSession(ctx);
  } catch {
    // Best effort: the original failure is what the caller needs.
  }

  return { kind: 'failed', reason };
};

/**
 * @description Runs a plan one task at a time over injected dependencies. Selects the lowest
 * `sortOrder` `IN_PROGRESS` task, else the lowest `PENDING`/`QUEUED`; for each runs start, work,
 * validate, complete or block, commit; then closes the plan with the three-way check and returns
 * an outcome the caller maps to finalize.
 * @public
 */
export const runOtLoop = async (
  options: RunOtLoopOptions,
): Promise<LoopOutcome> => {
  const ctx: LoopRunContext = {
    deps: options.deps,
    maxRetries: clampMaxRetries(options.maxRetries),
    planId: options.planId,
    tracker: {
      completedTaskIds: [],
      currentTaskId: undefined,
      guidance: [],
      sessionId: undefined,
      taskStartedAt: options.deps.clock.now(),
    },
  };

  try {
    return await step(ctx, options.taskId);
  } catch (error) {
    return recover(ctx, error);
  }
};
