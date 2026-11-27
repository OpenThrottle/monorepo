import { cn } from '@openthrottle/react-router-shadcn';
import * as React from 'react';

import { CHAT_CONTEXT_METER_COPY } from '../data/copy';
import type { ChatTokenUsage } from '../types';
import { resolveContextWindowUsage } from '../utils/chat-context-window';
import { formatContextMeterLabel } from '../utils/formatContextMeterLabel';
import { ChatContextMeterBar } from './ChatContextMeterBar';

export interface ChatContextMeterProps {
  readonly className?: string;
  /** Usage snapshot; the meter reads its `contextTokens` / `contextWindowTokens`. */
  readonly usage: ChatTokenUsage;
}

/**
 * @description Compact context-window meter for the composer footer: a thin
 * bar plus the fill percentage. Renders nothing unless the backend reported
 * both the context occupancy and the window size.
 * @public
 */
export const ChatContextMeter = (
  props: ChatContextMeterProps,
): React.ReactElement | null => {
  const { className, usage } = props;

  // Hooks

  // Setup
  const fill = resolveContextWindowUsage(usage);
  const label = fill === undefined ? '' : formatContextMeterLabel(fill);

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit
  if (fill === undefined) {
    return null;
  }

  return (
    <span
      aria-label={label}
      aria-valuemax={100}
      aria-valuemin={0}
      aria-valuenow={fill.percent}
      className={cn(
        'text-muted-foreground inline-flex items-center gap-1.5 text-[0.7rem] tabular-nums',
        className,
      )}
      data-testid="ChatContextMeter"
      role="meter"
      title={CHAT_CONTEXT_METER_COPY.title}
    >
      <ChatContextMeterBar className="w-10" fill={fill} />
      <span aria-hidden="true">{fill.percent}%</span>
    </span>
  );
};
