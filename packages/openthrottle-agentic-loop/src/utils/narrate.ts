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
