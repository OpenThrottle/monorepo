import { cn } from '@openthrottle/react-router-shadcn';
import * as React from 'react';

import { CHAT_CONTEXT_METER_TONE_CLASSES } from '../data/chat-context-meter.classes';
import type { ChatContextWindowUsage } from '../utils/chat-context-window';

export interface ChatContextMeterBarProps {
  /** Sizing for the track (width); the bar is `h-1.5` and rounded. */
  readonly className?: string;
  /** The window fill to draw: the width is `percent`, the colour is `tone`. */
  readonly fill: ChatContextWindowUsage;
}

/**
 * @description The context-window bar: a muted track with a tone-coloured fill.
 * Decorative (`aria-hidden`); the parent owns the `role="meter"` and its label.
 *
 * @public
 */
export const ChatContextMeterBar = (
  props: ChatContextMeterBarProps,
): React.ReactElement => {
  const { className, fill } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <span
      aria-hidden="true"
      className={cn(
        'bg-muted relative h-1.5 overflow-hidden rounded-full',
        className,
      )}
      data-testid="ChatContextMeterBar"
    >
      <span
        className={cn(
          'absolute inset-y-0 left-0 rounded-full',
          CHAT_CONTEXT_METER_TONE_CLASSES[fill.tone],
        )}
        data-testid="ChatContextMeterBar-fill"
        data-tone={fill.tone}
        style={{ width: `${fill.percent}%` }}
      />
    </span>
  );
};
