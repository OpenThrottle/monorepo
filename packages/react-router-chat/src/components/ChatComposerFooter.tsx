import * as React from 'react';
import { Button } from '@openthrottle/react-router-shadcn';
import clsx from 'clsx';
import { ChatUsageCounter } from './ChatUsageCounter';
import type { ChatTokenUsage } from '../types';

export interface ChatComposerFooterProps {
  readonly disabled: boolean;
  /** Current draft; the Send button is disabled while it is empty. */
  readonly draft: string;
  readonly isStreaming: boolean;
  readonly onStop?: () => void;
  /** Cumulative session usage; the counter is hidden when omitted. */
  readonly sessionUsage?: ChatTokenUsage;
  readonly stopLabel: string;
  readonly submitLabel: string;
  /** Optional controls docked to the left of the send/stop action. */
  readonly toolbar?: React.ReactNode;
}

/**
 * @description {@link ChatComposer}'s footer row: an optional docked toolbar on
 * the left, and on the right the running token counter plus the send/stop
 * action — Send (submit, disabled while the draft is empty) when idle, Stop
 * (wired to {@link onStop}) while streaming.
 *
 * @public
 */
export const ChatComposerFooter = (
  props: ChatComposerFooterProps,
): React.ReactElement => {
  const {
    disabled,
    draft,
    isStreaming,
    onStop,
    sessionUsage,
    stopLabel,
    submitLabel,
    toolbar,
  } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div
      className={clsx(
        'flex items-center gap-3',
        toolbar ? 'justify-between' : 'justify-end',
      )}
    >
      {toolbar}
      <div className="flex items-center gap-3">
        {sessionUsage !== undefined ? (
          <ChatUsageCounter streaming={isStreaming} usage={sessionUsage} />
        ) : null}
        {isStreaming ? (
          <Button onClick={onStop} size="sm" type="button">
            {stopLabel}
          </Button>
        ) : (
          <Button
            disabled={disabled || draft.trim().length === 0}
            size="sm"
            type="submit"
          >
            {submitLabel}
          </Button>
        )}
      </div>
    </div>
  );
};
