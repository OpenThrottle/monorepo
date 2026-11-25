import { Input } from '@openthrottle/react-router-shadcn';
import * as React from 'react';

export interface ChatConversationEditInputProps {
  readonly ariaLabel: string;
  readonly onChange: (value: string) => void;
  /** Saves the edit: clicking away keeps what was typed. */
  readonly onCommit: () => void;
  readonly onKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => void;
  readonly testId: string;
  readonly value: string;
}

/**
 * @description The one inline input {@link ChatConversationSidebar} uses for a
 * conversation title, a group name and a new group's name. Focused and
 * selected on mount; blur saves (Enter and Escape are the caller's
 * `onKeyDown`).
 */
export const ChatConversationEditInput = (
  props: ChatConversationEditInputProps,
): React.ReactElement => {
  const { ariaLabel, onChange, onCommit, onKeyDown, testId, value } = props;

  // Hooks
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Setup

  // Handlers

  // Markup

  // Life Cycle
  React.useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  // 🔌 Short Circuit

  return (
    <Input
      aria-label={ariaLabel}
      className="h-8"
      data-testid={testId}
      onBlur={onCommit}
      onChange={(event) => onChange(event.target.value)}
      onKeyDown={onKeyDown}
      placeholder={ariaLabel}
      ref={inputRef}
      value={value}
    />
  );
};
