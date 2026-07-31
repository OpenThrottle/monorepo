import { ChatReasoningLevel, ChatServiceTier } from '../types';

/**
 * Canonical UI labels for reasoning levels (overridable via props). Kept out of
 * {@link ChatReasoningTierControl} per the repo's component/data split.
 * @public
 */
export const DEFAULT_REASONING_LABELS: Record<ChatReasoningLevel, string> = {
  [ChatReasoningLevel.extraHigh]: 'Extra High',
  [ChatReasoningLevel.high]: 'High',
  [ChatReasoningLevel.low]: 'Low',
  [ChatReasoningLevel.max]: 'Max',
  [ChatReasoningLevel.medium]: 'Medium',
  [ChatReasoningLevel.ultra]: 'Ultra',
};

/**
 * Canonical UI labels for service tiers (overridable via props). Kept out of
 * {@link ChatReasoningTierControl} per the repo's component/data split.
 * @public
 */
export const DEFAULT_SERVICE_TIER_LABELS: Record<ChatServiceTier, string> = {
  [ChatServiceTier.fast]: 'Fast',
  [ChatServiceTier.standard]: 'Standard',
};
