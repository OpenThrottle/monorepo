import * as React from 'react';
import { Button, TextArea } from '@openthrottle/react-router-shadcn';
import classnames from 'classnames';

export interface ChatComposerProps {
  readonly className?: string;
  readonly disabled?: boolean;
  readonly onSubmit: (message: string) => void;
  readonly placeholder?: string;
  readonly submitLabel?: string;
}

/**
 * @description Message input with submit button; Enter sends, Shift+Enter inserts a newline.
 */
export const ChatComposer = (props: ChatComposerProps): React.ReactElement => {
  const {
    className,
    disabled = false,
    onSubmit,
    placeholder = 'Type a message…',
    submitLabel = 'Send',
  } = props;

  // Hooks
  const [draft, setDraft] = React.useState('');

  // Setup

  // Handlers
  const submitDraft = (): void => {
    const trimmed = draft.trim();
    if (!trimmed || disabled) {
      return;
    }
    onSubmit(trimmed);
    setDraft('');
  };

  const onFormSubmit = (event: React.FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    submitDraft();
  };

  const onTextAreaKeyDown = (
    event: React.KeyboardEvent<HTMLTextAreaElement>,
  ): void => {
    if (event.key !== 'Enter' || event.shiftKey) {
      return;
    }

    event.preventDefault();
    submitDraft();
  };

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <form
      className={classnames(
        'flex shrink-0 flex-col gap-4 border-t pt-4',
        className,
      )}
      data-testid="ChatComposer"
      onSubmit={onFormSubmit}
    >
      <TextArea
        aria-label="Message"
        disabled={disabled}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={onTextAreaKeyDown}
        placeholder={placeholder}
        rows={3}
        value={draft}
      />
      <div className="flex justify-end">
        <Button
          disabled={disabled || draft.trim().length === 0}
          size="sm"
          type="submit"
        >
          {submitLabel}
        </Button>
      </div>
    </form>
  );
};
