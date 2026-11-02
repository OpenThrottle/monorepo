import * as React from 'react';

import { formatUsageLimitMessage } from '../data/chat-usage-limit.copy';
import type { ChatTurnUsageLimitEvent } from '../types';

export interface ChatUsageLimitNoticeProps {
  /** The turn's usage-limit event (window type + ISO reset time). */
  readonly event: ChatTurnUsageLimitEvent;
}

/**
 * @description One muted status line shown in an assistant turn when the
 * backend account hit a subscription usage limit: "Usage limit reached — resets
 * <local time>", or "Usage limit reached" when the reset time is unknown.
 * @public
 */
export const ChatUsageLimitNotice = (
  props: ChatUsageLimitNoticeProps,
): React.ReactElement => {
  const { event } = props;

  // Hooks

  // Setup
  const message = formatUsageLimitMessage(event.resetsAt);

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div
      className="text-muted-foreground my-1 text-sm"
      data-rate-limit-type={event.rateLimitType ?? undefined}
      data-testid="ChatUsageLimitNotice"
      role="status"
    >
      {message}
    </div>
  );
};
