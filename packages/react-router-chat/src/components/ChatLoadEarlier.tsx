import { Button } from '@openthrottle/react-router-shadcn';
import * as React from 'react';

import { CHAT_LOAD_EARLIER_COPY } from '../data/copy';

export interface ChatLoadEarlierProps {
  /** Disable the control while a page is loading. */
  readonly isLoading: boolean;
  readonly onLoadEarlier: () => void;
}

/**
 * @description The control at the top of a restored thread that pages back
 * through its older messages. Presentational: {@link ChatThread} keeps the
 * reading position when the page lands.
 */
export const ChatLoadEarlier = (
  props: ChatLoadEarlierProps,
): React.ReactElement => {
  const { isLoading, onLoadEarlier } = props;

  // Hooks

  // Setup
  const label = isLoading
    ? CHAT_LOAD_EARLIER_COPY.loading
    : CHAT_LOAD_EARLIER_COPY.label;

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div className="flex justify-center" data-testid="ChatLoadEarlier">
      <Button
        aria-busy={isLoading}
        disabled={isLoading}
        onClick={onLoadEarlier}
        size="sm"
        type="button"
        variant="ghost"
      >
        {label}
      </Button>
    </div>
  );
};
