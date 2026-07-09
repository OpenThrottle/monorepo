import * as React from 'react';
import { Button, TextArea } from '@openthrottle/react-router-shadcn';
import clsx from 'clsx';

export interface ChatComposerProps {
  readonly className?: string;
  readonly disabled?: boolean;
  /**
   * Controlled draft value. Omit for the default uncontrolled draft; provide
   * together with {@link onDraftChange} when the consumer needs to write into
   * the draft (e.g. streaming a live voice transcript).
   */
  readonly draft?: string;
  /**
   * When true, the Send button is replaced by a Stop button wired to
   * {@link onStop}, and Enter/submit is blocked. NOTE: this is a presentational
   * in-flight affordance — the package performs no real cancellation; the
   * consumer's {@link onStop} decides what (if anything) stopping does.
   */
  readonly isStreaming?: boolean;
  /** Called with the new draft on user edits and on post-submit clearing (controlled mode). */
  readonly onDraftChange?: (draft: string) => void;
  /** Invoked when the Stop button is pressed while {@link isStreaming}. */
  readonly onStop?: () => void;
  readonly onSubmit: (message: string) => void;
  readonly placeholder?: string;
  /**
   * Freeze the draft (e.g. while voice input is recording): the textarea goes
   * read-only + dimmed and Enter/submit is blocked. The consumer keeps writing
   * via {@link draft}.
   */
  readonly readOnly?: boolean;
  readonly stopLabel?: string;
  readonly submitLabel?: string;
  /** Ref to the underlying textarea (focus / cursor placement). */
  readonly textAreaRef?: React.Ref<HTMLTextAreaElement>;
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
    draft: controlledDraft,
    isStreaming = false,
    onDraftChange,
    onStop,
    onSubmit,
    placeholder = 'Type a message…',
    readOnly = false,
    stopLabel = 'Stop',
    submitLabel = 'Send',
    textAreaRef,
    toolbar,
  } = props;

  // Hooks
  const [internalDraft, setInternalDraft] = React.useState('');

  // Setup
  const isControlled = controlledDraft !== undefined;
  const draft = isControlled ? controlledDraft : internalDraft;

  // Handlers
  const setDraft = (value: string): void => {
    if (!isControlled) {
      setInternalDraft(value);
    }
    onDraftChange?.(value);
  };

  const submitDraft = (): void => {
    const trimmed = draft.trim();
    if (!trimmed || disabled || isStreaming || readOnly) {
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
      className={clsx('flex shrink-0 flex-col gap-4 border-t pt-4', className)}
      data-testid="ChatComposer"
      onSubmit={onFormSubmit}
    >
      <TextArea
        aria-label="Message"
        className={clsx({ 'text-muted-foreground': readOnly })}
        disabled={disabled}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={onTextAreaKeyDown}
        placeholder={placeholder}
        readOnly={readOnly}
        ref={textAreaRef}
        rows={3}
        value={draft}
      />
      <div
        className={clsx('flex', toolbar ? 'justify-between' : 'justify-end')}
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
