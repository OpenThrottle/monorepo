import * as React from 'react';
import { TextArea } from '@openthrottle/react-router-shadcn';
import clsx from 'clsx';
import type { ChatMentionProvider, ChatTokenUsage } from '../types';
import { ChatComposerFooter } from './ChatComposerFooter';
import { ChatMentionPopover } from './ChatMentionPopover';
import { useChatComposerMentions } from '../hooks/use-chat-composer-mentions';

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
  /**
   * Optional `@`-mention file source. When provided, typing `@` opens a fuzzy
   * file-picker popover backed by {@link ChatMentionProvider.onQueryFiles} and
   * inserts the chosen workspace-relative path at the caret. Omit to keep the
   * composer a plain textarea. Presentational: the package embeds no transport.
   */
  readonly mentionProvider?: ChatMentionProvider;
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
  /**
   * Optional cumulative session usage rendered as a muted running token counter
   * in the footer (live while {@link isStreaming}, a conversation total when
   * idle). Presentational — the consumer owns the total (summed across turns).
   * Omit, or pass an all-empty usage, to hide the counter.
   */
  readonly sessionUsage?: ChatTokenUsage;
  readonly stopLabel?: string;
  readonly submitLabel?: string;
  /** Ref to the underlying textarea (focus / cursor placement). */
  readonly textAreaRef?: React.Ref<HTMLTextAreaElement>;
  readonly toolbar?: React.ReactNode;
}

/**
 * @description Message input with submit button; Enter sends, Shift+Enter inserts a newline.
 * Optionally docks a {@link toolbar} into its footer and swaps Send for Stop while streaming.
 * When {@link ChatComposerProps.mentionProvider} is supplied, typing `@` opens a fuzzy
 * file-mention popover that inserts a workspace-relative `@path` token at the caret.
 */
export const ChatComposer = (props: ChatComposerProps): React.ReactElement => {
  const {
    className,
    disabled = false,
    draft: controlledDraft,
    isStreaming = false,
    mentionProvider,
    onDraftChange,
    onStop,
    onSubmit,
    placeholder = 'Type a message…',
    readOnly = false,
    sessionUsage,
    stopLabel = 'Stop',
    submitLabel = 'Send',
    textAreaRef,
    toolbar,
  } = props;

  // Hooks
  const [internalDraft, setInternalDraft] = React.useState('');
  const isControlled = controlledDraft !== undefined;
  const draft = isControlled ? controlledDraft : internalDraft;

  const setDraft = (value: string): void => {
    if (!isControlled) {
      setInternalDraft(value);
    }
    onDraftChange?.(value);
  };

  const mentions = useChatComposerMentions({
    disabled,
    draft,
    mentionProvider,
    readOnly,
    setDraft,
    textAreaRef,
  });

  // Setup
  const {
    activeIndex,
    listboxId,
    loading,
    mentionEnabled,
    optionId,
    popoverOpen,
    results,
  } = mentions;

  // Handlers
  const submitDraft = (): void => {
    const trimmed = draft.trim();
    if (!trimmed || disabled || isStreaming || readOnly) {
      return;
    }
    onSubmit(trimmed);
    setDraft('');
    mentions.reset();
  };

  const onFormSubmit = (event: React.FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    submitDraft();
  };

  const onTextAreaKeyDown = (
    event: React.KeyboardEvent<HTMLTextAreaElement>,
  ): void => {
    if (mentions.handleKeyDown(event)) {
      return;
    }
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
      <div className="relative">
        <TextArea
          aria-activedescendant={
            popoverOpen && results.length > 0
              ? optionId(activeIndex)
              : undefined
          }
          aria-autocomplete={mentionEnabled ? 'list' : undefined}
          aria-controls={popoverOpen ? listboxId : undefined}
          aria-expanded={mentionEnabled ? popoverOpen : undefined}
          aria-label="Message"
          className={clsx({ 'text-muted-foreground': readOnly })}
          disabled={disabled}
          onChange={mentions.onChange}
          onClick={mentions.onClick}
          onKeyDown={onTextAreaKeyDown}
          onKeyUp={mentions.onKeyUp}
          placeholder={placeholder}
          readOnly={readOnly}
          ref={mentions.setRefs}
          rows={3}
          value={draft}
        />
        {popoverOpen ? (
          <ChatMentionPopover
            activeIndex={activeIndex}
            emptyLabel={mentionProvider?.emptyLabel ?? 'No matching files.'}
            listboxId={listboxId}
            loading={loading}
            loadingLabel={mentionProvider?.loadingLabel ?? 'Searching files…'}
            onHoverOption={mentions.setActiveIndex}
            onSelectOption={mentions.selectOption}
            optionId={optionId}
            results={results}
          />
        ) : null}
      </div>
      <ChatComposerFooter
        disabled={disabled}
        draft={draft}
        isStreaming={isStreaming}
        onStop={onStop}
        sessionUsage={sessionUsage}
        stopLabel={stopLabel}
        submitLabel={submitLabel}
        toolbar={toolbar}
      />
    </form>
  );
};
