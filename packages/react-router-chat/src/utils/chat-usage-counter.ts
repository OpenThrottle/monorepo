import type { ChatTokenUsage } from '../types';

/**
 * Best-effort session token total (explicit total, else input + output). Kept
 * out of {@link ChatUsageCounter} per the repo's component/utils split.
 * @public
 */
export const resolveTotalTokens = (
  usage: ChatTokenUsage,
): number | undefined => {
  if (usage.totalTokens !== undefined) {
    return usage.totalTokens;
  }

  if (usage.inputTokens === undefined && usage.outputTokens === undefined) {
    return undefined;
  }

  return (usage.inputTokens ?? 0) + (usage.outputTokens ?? 0);
};
