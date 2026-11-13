import type {
  AttemptFailure,
  GitHeadState,
  LoopFollowUp,
  LoopOutcome,
  LoopTask,
  WorkerAttemptResult,
  WorkerResult,
} from '../contract/index.ts';
import { LOOP_TASK_STATUS } from '../contract/index.ts';
import { THIN_TASK_BLOCK_SUMMARY } from '../data/data.constants.ts';
import { endTaskSession } from './endTaskSession.ts';
import { guardWorker } from './guardWorker.ts';
import { isThinTask } from './isThinTask.ts';
import type { LoopRunContext } from './loop-run-context.ts';
import { narrate } from './narrate.ts';

/** @description What the task loop does after one task: go on, or stop the run with an outcome. */
export type TaskStep =
  | { readonly kind: 'continue' }
  | { readonly kind: 'stop'; readonly outcome: LoopOutcome };

interface TaskScope {
  readonly boundarySnapshot: readonly LoopTask[];
  readonly startHead: GitHeadState;
  readonly task: LoopTask;
}

interface AttemptSpec {
  /** Separate budget (docs § 7): one commit-fix attempt per task, not drawn from `maxRetries`. */
  readonly commitFixUsed: boolean;
  readonly failure: AttemptFailure | undefined;
  readonly retriesUsed: number;
}

const CONTINUE: TaskStep = { kind: 'continue' };

const flipTask = async (
  ctx: LoopRunContext,
  task: LoopTask,
  status: (typeof LOOP_TASK_STATUS)[keyof typeof LOOP_TASK_STATUS],
  summary: string | undefined,
): Promise<void> => {
  await ctx.deps.client.updateTask({ status, summary, taskId: task.id });
  ctx.tracker.currentTaskId = undefined;

  const seconds = Math.round(
    (ctx.deps.clock.now() - ctx.tracker.taskStartedAt) / 1000,
  );

  await narrate(
    ctx,
    `task ${status} after ${seconds}s: ${summary ?? ''}`,
    task.id,
  );
};

const createFollowUps = async (
  ctx: LoopRunContext,
  followUps: readonly LoopFollowUp[],
): Promise<void> => {
  if (followUps.length > 0) {
    await ctx.deps.client.createFollowUps({ followUps, planId: ctx.planId });
  }
};

/** Saves the task's patch and restores the worktree; posts the patch `--stat` summary (§ 5). */
const discardChanges = async (
  ctx: LoopRunContext,
  scope: TaskScope,
): Promise<void> => {
  const { statSummary } = await ctx.deps.git.discardTaskChanges({
    taskId: scope.task.id,
    taskStartSha: scope.startHead.sha,
  });

  if (statSummary.trim() !== '') {
    await narrate(
      ctx,
      `uncommitted work saved to .ot-loop/patches/${scope.task.id}.patch:\n${statSummary}`,
      scope.task.id,
    );
  }
};

/** Task did not complete: save the patch, restore the worktree, keep follow-ups, flip BLOCKED. */
const blockTask = async (
  ctx: LoopRunContext,
  scope: TaskScope,
  summary: string,
  followUps: readonly LoopFollowUp[],
): Promise<TaskStep> => {
  await discardChanges(ctx, scope);
  await createFollowUps(ctx, followUps);
  await flipTask(ctx, scope.task, LOOP_TASK_STATUS.BLOCKED, summary);

  return CONTINUE;
};

const skipTask = async (
  ctx: LoopRunContext,
  scope: TaskScope,
  result: WorkerResult,
): Promise<TaskStep> => {
  await discardChanges(ctx, scope);
  await createFollowUps(ctx, result.followUps);
  await flipTask(ctx, scope.task, LOOP_TASK_STATUS.SKIPPED, result.reason);

  return CONTINUE;
};

/** Cancel: the task was not done, so it goes back to PENDING (never BLOCKED). */
const cancelTask = async (
  ctx: LoopRunContext,
  scope: TaskScope,
): Promise<TaskStep> => {
  await discardChanges(ctx, scope);
  await flipTask(ctx, scope.task, LOOP_TASK_STATUS.PENDING, `cancelled`);
  await endTaskSession(ctx);

  return {
    kind: 'stop',
    outcome: { kind: 'cancelled', taskId: scope.task.id },
  };
};

/** Usage limit: PENDING again, worktree kept as is (no patch, no reset). */
const usageLimitTask = async (
  ctx: LoopRunContext,
  scope: TaskScope,
): Promise<TaskStep> => {
  await flipTask(ctx, scope.task, LOOP_TASK_STATUS.PENDING, `usage limited`);
  await endTaskSession(ctx);

  return {
    kind: 'stop',
    outcome: { kind: 'usage_limited', taskId: scope.task.id },
  };
};

const commitAndComplete = async (
  ctx: LoopRunContext,
  scope: TaskScope,
  result: WorkerResult,
  spec: AttemptSpec,
): Promise<TaskStep> => {
  const committed = await ctx.deps.git.commit({
    commitMessage: result.commitMessage,
    planId: ctx.planId,
    task: scope.task,
  });

  if (committed.kind === 'failed') {
    if (spec.commitFixUsed) {
      return blockTask(
        ctx,
        scope,
        `commit failed after a fix attempt: ${committed.output}`,
        result.followUps,
      );
    }

    return attempt(ctx, scope, {
      commitFixUsed: true,
      failure: { kind: 'commit', output: committed.output },
      retriesUsed: spec.retriesUsed,
    });
  }

  // Order (§ 7): commit -> follow-ups -> COMPLETED, so the auto-close never precedes follow-ups.
  await createFollowUps(ctx, result.followUps);
  await flipTask(ctx, scope.task, LOOP_TASK_STATUS.COMPLETED, result.reason);
  ctx.tracker.completedTaskIds.push(scope.task.id);

  return CONTINUE;
};

/** A failed attempt consumes one retry; after the last one the task is BLOCKED. */
const failAttempt = async (
  ctx: LoopRunContext,
  scope: TaskScope,
  spec: AttemptSpec,
  failure: AttemptFailure,
  blockSummary: string,
): Promise<TaskStep> => {
  // Follow-ups from a failed attempt are discarded: the result is never read past this point.
  if (spec.retriesUsed >= ctx.maxRetries) {
    return blockTask(ctx, scope, blockSummary, []);
  }

  if (await ctx.deps.cancel.isCancelled()) {
    return cancelTask(ctx, scope);
  }

  await narrate(
    ctx,
    `attempt ${spec.retriesUsed + 1} failed; retrying`,
    scope.task.id,
  );

  return attempt(ctx, scope, {
    commitFixUsed: spec.commitFixUsed,
    failure,
    retriesUsed: spec.retriesUsed + 1,
  });
};

const validateAndCommit = async (
  ctx: LoopRunContext,
  scope: TaskScope,
  result: WorkerResult,
  spec: AttemptSpec,
): Promise<TaskStep> => {
  const validation = await ctx.deps.validator.validate({
    signal: ctx.deps.cancel.signal,
    task: scope.task,
    taskStartSha: scope.startHead.sha,
  });

  if (validation.kind === 'aborted') {
    return cancelTask(ctx, scope);
  }

  if (validation.kind === 'red') {
    return failAttempt(
      ctx,
      scope,
      spec,
      {
        command: validation.command,
        exitCode: validation.exitCode,
        kind: 'validation',
        tail: validation.tail,
      },
      `validation failed after ${spec.retriesUsed + 1} attempts: ${validation.command} exited ${validation.exitCode}`,
    );
  }

  return commitAndComplete(ctx, scope, result, spec);
};

const interpretResult = async (
  ctx: LoopRunContext,
  scope: TaskScope,
  spec: AttemptSpec,
  attemptResult: WorkerAttemptResult,
  carriedGuidance: boolean,
): Promise<TaskStep> => {
  switch (attemptResult.kind) {
    case 'aborted':
      return cancelTask(ctx, scope);
    case 'usage_limited':
      return usageLimitTask(ctx, scope);
    case 'error':
      return failAttempt(
        ctx,
        scope,
        spec,
        { kind: 'worker', message: attemptResult.message },
        `worker failed: ${attemptResult.message}`,
      );
    case 'missing':
      return failAttempt(
        ctx,
        scope,
        spec,
        { kind: 'worker', message: 'the result file was missing' },
        `worker did not produce a valid result file: missing`,
      );
    case 'malformed':
      return failAttempt(
        ctx,
        scope,
        spec,
        {
          kind: 'worker',
          message: `the result file was malformed: ${attemptResult.error}`,
        },
        `worker did not produce a valid result file: ${attemptResult.error}`,
      );
    case 'ok':
      break;
  }

  const { result } = attemptResult;

  if (result.status === 'skipped' && carriedGuidance) {
    return skipTask(ctx, scope, result);
  }

  // `blocked`, or `skipped` without operator guidance: BLOCKED, no validation, no retry.
  if (result.status !== 'done') {
    return blockTask(ctx, scope, result.reason, result.followUps);
  }

  return validateAndCommit(ctx, scope, result, spec);
};

const runWorker = async (
  ctx: LoopRunContext,
  scope: TaskScope,
  spec: AttemptSpec,
): Promise<WorkerAttemptResult> => {
  try {
    return await ctx.deps.worker.run({
      guidance: ctx.tracker.guidance,
      model: ctx.deps.modelFor(scope.task),
      previousFailure: spec.failure,
      signal: ctx.deps.cancel.signal,
      task: scope.task,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    return { kind: 'error', message };
  }
};

const attempt = async (
  ctx: LoopRunContext,
  scope: TaskScope,
  spec: AttemptSpec,
): Promise<TaskStep> => {
  const carriedGuidance = ctx.tracker.guidance.length > 0;
  const attemptResult = await runWorker(ctx, scope, spec);

  await guardWorker(ctx, scope.task, scope.startHead, scope.boundarySnapshot);

  // An aborted attempt is a cancel, never a failed attempt (§ 5).
  if (ctx.deps.cancel.signal.aborted) {
    return cancelTask(ctx, scope);
  }

  return interpretResult(ctx, scope, spec, attemptResult, carriedGuidance);
};

/**
 * @description Runs one selected task: thin check, start (status + per-task work session), work,
 * validate, complete or block, commit.
 */
export const runTask = async (
  ctx: LoopRunContext,
  task: LoopTask,
  boundarySnapshot: readonly LoopTask[],
): Promise<TaskStep> => {
  const { client, git } = ctx.deps;

  ctx.tracker.currentTaskId = task.id;
  ctx.tracker.taskStartedAt = ctx.deps.clock.now();

  if (isThinTask(task)) {
    await flipTask(
      ctx,
      task,
      LOOP_TASK_STATUS.BLOCKED,
      THIN_TASK_BLOCK_SUMMARY,
    );

    return CONTINUE;
  }

  // Resumed tasks are already IN_PROGRESS; selection prefers them, so no other task is.
  if (task.status !== LOOP_TASK_STATUS.IN_PROGRESS) {
    await client.updateTask({
      status: LOOP_TASK_STATUS.IN_PROGRESS,
      summary: undefined,
      taskId: task.id,
    });
  }

  ctx.tracker.sessionId = await client.startWorkSession({
    model: ctx.deps.modelFor(task),
    planId: ctx.planId,
    taskId: task.id,
  });
  await narrate(ctx, `task started: ${task.title}`, task.id);

  const startHead = await git.head();

  return attempt(
    ctx,
    { boundarySnapshot, startHead, task },
    { commitFixUsed: false, failure: undefined, retriesUsed: 0 },
  );
};
