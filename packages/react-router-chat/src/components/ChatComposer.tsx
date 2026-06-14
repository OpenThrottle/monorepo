import * as React from 'react';
import { Button, TextArea } from '@openthrottle/react-router-shadcn';
import classnames from 'classnames';

export interface ChatComposerProps {
  readonly className?: string;
  readonly disabled?: boolean;
  /**
   * When true, the Send button is replaced by a Stop button wired to
   * {@link onStop}, and Enter/submit is blocked. NOTE: this is a presentational
   * in-flight affordance — the package performs no real cancellation; the
   * consumer's {@link onStop} decides what (if anything) stopping does.
   */
  readonly isStreaming?: boolean;
  /** Invoked when the Stop button is pressed while {@link isStreaming}. */
  readonly onStop?: () => void;
  readonly onSubmit: (message: string) => void;
  readonly placeholder?: string;
  readonly stopLabel?: string;
  readonly submitLabel?: string;
  readonly toolbar?: React.ReactNode;
}

/**
 * @description Message input with submit button; Enter sends, Shift+Enter inserts a newline.
 * Optionally docks a {@link toolbar} into its footer and swaps Send for Stop while streaming.
 */
export const ChatComposer = (props: ChatComposerProps): React.ReactElement => {
  const {
    className,
    disabled = false,
    isStreaming = false,
    onStop,
    onSubmit,
    placeholder = 'Type a message…',
    stopLabel = 'Stop',
    submitLabel = 'Send',
    toolbar,
  } = props;

  // Hooks
  const [draft, setDraft] = React.useState('');

  // Setup

  // Handlers
  const submitDraft = (): void => {
    const trimmed = draft.trim();
    if (!trimmed || disabled || isStreaming) {
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
      <div
        className={classnames(
          'flex',
          toolbar ? 'justify-between' : 'justify-end',
        )}
      >
        {toolbar}
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
    </form>
  );
};
