import { Button, cn } from '@openthrottle/react-router-shadcn';
import * as React from 'react';

import { CHAT_COMPOSER_QUEUE_COPY } from '../data/copy';
import type { ChatTokenUsage } from '../types';
import { ChatContextMeter } from './ChatContextMeter';
import { ChatUsageCounter } from './ChatUsageCounter';

export interface ChatComposerFooterProps {
  readonly disabled: boolean;
  /** Current draft; the Send and Queue buttons are disabled while it is empty. */
  readonly draft: string;
  /** Streaming with queuing on: render a Queue submit button beside Stop. */
  readonly isQueueing: boolean;
  readonly isStreaming: boolean;
  readonly onStop?: () => void;
  /** Cumulative session usage; the counter is hidden when omitted. */
  readonly sessionUsage?: ChatTokenUsage;
  /** Render the {@link ChatContextMeter} beside the counter (opt-in). */
  readonly showContextMeter: boolean;
  readonly stopLabel: string;
  readonly submitLabel: string;
  /** Optional controls docked to the left of the send/stop action. */
  readonly toolbar?: React.ReactNode;
}

/**
 * @description {@link ChatComposer}'s footer row: an optional docked toolbar on
 * the left, and on the right the running token counter plus the send/stop
 * action — Send (submit, disabled while the draft is empty) when idle, Stop
 * (wired to {@link onStop}) while streaming, with a Queue submit button beside
 * Stop when {@link ChatComposerFooterProps.isQueueing}.
 *
 * @public
 */
export const ChatComposerFooter = (
  props: ChatComposerFooterProps,
): React.ReactElement => {
  const {
    disabled,
    draft,
    isQueueing,
    isStreaming,
    onStop,
    sessionUsage,
    showContextMeter,
    stopLabel,
    submitLabel,
    toolbar,
  } = props;

  // Hooks

  // Setup
  const isSubmitDisabled = disabled || draft.trim().length === 0;

  // Handlers

  // Markup
  const stopButton = (
    <Button
      className="pointer-coarse:h-11 pointer-coarse:min-w-11"
      onClick={onStop}
      size="sm"
      type="button"
      variant={isQueueing ? 'outline' : 'default'}
    >
      {stopLabel}
    </Button>
  );
  const submitButton = (
    <Button
      className="pointer-coarse:h-11 pointer-coarse:min-w-11"
      disabled={isSubmitDisabled}
      size="sm"
      type="submit"
    >
      {isQueueing ? CHAT_COMPOSER_QUEUE_COPY.submitLabel : submitLabel}
    </Button>
  );
  const streamingActions = (
    <>
      {stopButton}
      {isQueueing && submitButton}
    </>
  );

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div
      className={cn(
        'flex items-center gap-3',
        toolbar ? 'justify-between' : 'justify-end',
      )}
    >
      {toolbar}
      <div className="flex shrink-0 items-center gap-3">
        {showContextMeter && sessionUsage !== undefined && (
          <ChatContextMeter usage={sessionUsage} />
        )}
        {sessionUsage !== undefined && (
          <ChatUsageCounter streaming={isStreaming} usage={sessionUsage} />
        )}
        {isStreaming ? streamingActions : submitButton}
      </div>
    </div>
  );
};
