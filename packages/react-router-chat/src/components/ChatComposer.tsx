import * as React from 'react';
import clsx from 'clsx';
import type {
  ChatMentionProvider,
  ChatSlashCommandProvider,
  ChatTokenUsage,
} from '../types';
import { ChatComposerFooter } from './ChatComposerFooter';
import { ChatComposerInput } from './ChatComposerInput';
import { useChatComposerMentions } from '../hooks/use-chat-composer-mentions';
import { useChatComposerSlashCommands } from '../hooks/use-chat-composer-slash-commands';

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
  /**
   * Optional `/`-command skill source. When provided, typing `/` at the start of
   * a line opens a skill-picker popover backed by
   * {@link ChatSlashCommandProvider.onQuerySkills} and inserts `/<slug> ` at the
   * caret. Omit to keep the composer free of a `/`-trigger. Presentational.
   */
  readonly slashCommandProvider?: ChatSlashCommandProvider;
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
    slashCommandProvider,
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
  // `textAreaRef` is forwarded by the mentions hook (above); the slash hook only
  // needs the node for post-insert caret placement, so it is not passed here.
  const slash = useChatComposerSlashCommands({
    disabled,
    draft,
    readOnly,
    setDraft,
    slashCommandProvider,
  });

  // Setup

  // Handlers
  const submitDraft = (): void => {
    const trimmed = draft.trim();
    if (!trimmed || disabled || isStreaming || readOnly) {
      return;
    }
    onSubmit(trimmed);
    setDraft('');
    mentions.reset();
    slash.reset();
  };

  const onFormSubmit = (event: React.FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    submitDraft();
  };

  const onTextAreaKeyDown = (
    event: React.KeyboardEvent<HTMLTextAreaElement>,
  ): void => {
    // Only one popover can be open at once (`/` is anchored to a line start,
    // `@` scans back mid-text), so the order here is not a precedence conflict —
    // whichever consumed the key bails before Enter-to-send.
    if (mentions.handleKeyDown(event) || slash.handleKeyDown(event)) {
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
      <ChatComposerInput
        disabled={disabled}
        draft={draft}
        mentionProvider={mentionProvider}
        mentions={mentions}
        onKeyDown={onTextAreaKeyDown}
        placeholder={placeholder}
        readOnly={readOnly}
        slash={slash}
        slashCommandProvider={slashCommandProvider}
      />
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
