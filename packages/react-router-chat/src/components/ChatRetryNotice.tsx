import * as React from 'react';
import { Button } from '@openthrottle/react-router-shadcn';

export interface ChatRetryNoticeProps {
  /** Disable the Retry button while a replay is already in flight. */
  readonly isRetrying?: boolean;
  /** Replay the last turn. */
  readonly onRetry: () => void;
}

/**
 * @description Inline recovery affordance shown after an assistant turn ended in
 * a retryable timeout and the single automatic retry was already spent. Offers a
 * manual Retry that replays the last turn. Kept presentational + shared so both
 * the home route and the header chat surface it identically.
 * @public
 */
export const ChatRetryNotice = (
  props: ChatRetryNoticeProps,
): React.ReactElement => {
  const { isRetrying = false, onRetry } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div
      className="text-muted-foreground flex items-center gap-2 text-sm"
      data-testid="ChatRetryNotice"
      role="status"
    >
      <span>Response timed out.</span>
      <Button
        disabled={isRetrying}
        onClick={onRetry}
        size="sm"
        type="button"
        variant="outline"
      >
        Retry
      </Button>
    </div>
  );
};
