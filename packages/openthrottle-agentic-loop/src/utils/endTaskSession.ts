import type { LoopRunContext } from './loop-run-context.ts';

/** @description Ends the tracked per-task session (never the processor's run session). */
export const endTaskSession = async (ctx: LoopRunContext): Promise<void> => {
  const { sessionId } = ctx.tracker;

  if (sessionId === undefined) {
    return;
  }

  ctx.tracker.sessionId = undefined;
  await ctx.deps.client.endWorkSession(sessionId);
};
