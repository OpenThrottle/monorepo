import type { ChatServiceTierValue } from '../types';
import type { ChatReasoningLevelValue } from '../types';
import { CHAT_REASONING_LEVEL, CHAT_SERVICE_TIER } from '../types';

/**
 * Canonical UI labels for reasoning levels (overridable via props). Kept out of
 * {@link ChatReasoningTierControl} per the repo's component/data split.
 * @public
 */
export const DEFAULT_REASONING_LABELS: Record<ChatReasoningLevelValue, string> =
  {
    [CHAT_REASONING_LEVEL.extraHigh]: 'Extra High',
    [CHAT_REASONING_LEVEL.high]: 'High',
    [CHAT_REASONING_LEVEL.low]: 'Low',
    [CHAT_REASONING_LEVEL.max]: 'Max',
    [CHAT_REASONING_LEVEL.medium]: 'Medium',
    [CHAT_REASONING_LEVEL.ultra]: 'Ultra',
  };

/**
 * Canonical UI labels for service tiers (overridable via props). Kept out of
 * {@link ChatReasoningTierControl} per the repo's component/data split.
 * @public
 */
export const DEFAULT_SERVICE_TIER_LABELS: Record<ChatServiceTierValue, string> =
  {
    [CHAT_SERVICE_TIER.fast]: 'Fast',
    [CHAT_SERVICE_TIER.standard]: 'Standard',
  };
