import { CHAT_CONTEXT_METER_COPY } from '../data/data.copy';
import { formatTokenCount } from '../usage';
import type { ChatContextWindowUsage } from './chat-context-window';

/**
 * @description The accessible label for a context meter, e.g.
 * "Context window: 84k of 200k tokens used (42%)".
 * @public
 */
export const formatContextMeterLabel = (
  fill: ChatContextWindowUsage,
): string => {
  return CHAT_CONTEXT_METER_COPY.ariaLabel
    .replace(
      CHAT_CONTEXT_METER_COPY.usedToken,
      formatTokenCount(fill.usedTokens),
    )
    .replace(
      CHAT_CONTEXT_METER_COPY.windowToken,
      formatTokenCount(fill.windowTokens),
    )
    .replace(CHAT_CONTEXT_METER_COPY.percentToken, String(fill.percent));
};
