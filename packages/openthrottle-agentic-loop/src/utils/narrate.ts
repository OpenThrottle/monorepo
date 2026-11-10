import type { LoopRunContext } from './loop-run-context.ts';

/** @description Plan-output narration; a narration failure never stops the loop. */
export const narrate = async (
  ctx: LoopRunContext,
  message: string,
  taskId: string | undefined,
): Promise<void> => {
  try {
    await ctx.deps.client.narrate({ message, taskId });
  } catch {
    // Narration is best effort.
  }
};
