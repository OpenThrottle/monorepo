import { cn } from '@openthrottle/react-router-shadcn';
import * as React from 'react';

import { CHAT_CONTEXT_METER_TONE_CLASSES } from '../data/chat-context-meter.classes';
import { CHAT_CONTEXT_METER_COPY } from '../data/data.copy';
import type { ChatTokenUsage } from '../types';
import { formatTokenCount } from '../usage';
import { resolveContextWindowUsage } from '../utils/chat-context-window';

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
  const label =
    fill === undefined
      ? ''
      : CHAT_CONTEXT_METER_COPY.ariaLabel
          .replace(
            CHAT_CONTEXT_METER_COPY.usedToken,
            formatTokenCount(fill.usedTokens),
          )
          .replace(
            CHAT_CONTEXT_METER_COPY.windowToken,
            formatTokenCount(fill.windowTokens),
          )
          .replace(CHAT_CONTEXT_METER_COPY.percentToken, String(fill.percent));

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
      <span
        aria-hidden="true"
        className="bg-muted relative h-1.5 w-10 overflow-hidden rounded-full"
      >
        <span
          className={cn(
            'absolute inset-y-0 left-0 rounded-full',
            CHAT_CONTEXT_METER_TONE_CLASSES[fill.tone],
          )}
          data-testid="ChatContextMeter-fill"
          data-tone={fill.tone}
          style={{ width: `${fill.percent}%` }}
        />
      </span>
      <span aria-hidden="true">{fill.percent}%</span>
    </span>
  );
};
