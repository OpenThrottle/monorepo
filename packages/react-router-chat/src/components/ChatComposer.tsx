import { cn } from '@openthrottle/react-router-shadcn';
import * as React from 'react';

import { useChatComposerMentions } from '../hooks/useChatComposerMentions';
import { useChatComposerPromptRecall } from '../hooks/useChatComposerPromptRecall';
import { useChatComposerSlashCommands } from '../hooks/useChatComposerSlashCommands';
import type {
  ChatMentionProvider,
  ChatSlashCommandProvider,
  ChatTokenUsage,
} from '../types';
import { ChatComposerFooter } from './ChatComposerFooter';
import { ChatComposerInput } from './ChatComposerInput';

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
   * Swaps Send for a Stop button wired to {@link onStop} and blocks Enter. Purely
   * presentational: the consumer's {@link onStop} decides what stopping does.
   */
  readonly isStreaming?: boolean;
  /**
   * Optional `@`-mention file source: typing `@` opens a file picker backed by
   * {@link ChatMentionProvider.onQueryFiles} that inserts the chosen path.
   */
  readonly mentionProvider?: ChatMentionProvider;
  /** Called with the new draft on user edits and on post-submit clearing (controlled mode). */
  readonly onDraftChange?: (draft: string) => void;
  /** Invoked when the Stop button is pressed while {@link isStreaming}. */
  readonly onStop?: () => void;
  readonly onSubmit: (message: string) => void;
  readonly placeholder?: string;
  /**
   * Sent prompts, oldest first, recalled with ArrowUp from an empty composer.
   * Omit to recall only what this composer has sent since it mounted.
   */
  readonly promptHistory?: readonly string[];
  /** Freeze the draft (e.g. voice recording): read-only and submit blocked; {@link draft} still writes. */
  readonly readOnly?: boolean;
  /** Consumer-owned session usage for the footer counter; omit or pass `{}` to hide it. */
  readonly sessionUsage?: ChatTokenUsage;
  /** Opt in to the context-window meter beside the counter (shown only when the backend reports context). */
  readonly showContextMeter?: boolean;
  /**
   * Optional `/`-command skill source: `/` at a line start opens a skill picker
   * backed by {@link ChatSlashCommandProvider.onQuerySkills}.
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
    promptHistory,
    readOnly = false,
    sessionUsage,
    showContextMeter = false,
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
  const recall = useChatComposerPromptRecall({
    disabled,
    draft,
    history: promptHistory,
    readOnly,
    setDraft,
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
    recall.onSent(trimmed);
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
    // whichever consumed the key bails before Enter-to-send. Prompt recall goes
    // last so an open popover keeps the arrow keys.
    if (
      mentions.handleKeyDown(event) ||
      slash.handleKeyDown(event) ||
      recall.handleKeyDown(event)
    ) {
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
      className={cn(
        'mt-4 flex shrink-0 flex-col gap-4 border-t pt-4',
        className,
      )}
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
        showContextMeter={showContextMeter}
        stopLabel={stopLabel}
        submitLabel={submitLabel}
        toolbar={toolbar}
      />
    </form>
  );
};
