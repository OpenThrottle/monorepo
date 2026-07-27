import * as React from 'react';
import { Button, TextArea } from '@openthrottle/react-router-shadcn';
import clsx from 'clsx';
import {
  type ActiveFileMention,
  detectActiveMention,
  insertFileMention,
} from '../file-mentions';
import type { ChatMentionProvider } from '../types';
import { ChatMentionPopover } from './ChatMentionPopover';

/** Keys that move the caret without editing, so the mention state is re-detected. */
const CARET_MOVEMENT_KEYS = new Set(['ArrowLeft', 'ArrowRight', 'End', 'Home']);

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
    stopLabel = 'Stop',
    submitLabel = 'Send',
    textAreaRef,
    toolbar,
  } = props;

  // Hooks
  const [internalDraft, setInternalDraft] = React.useState('');
  const [mention, setMention] = React.useState<ActiveFileMention | null>(null);
  const [results, setResults] = React.useState<readonly string[]>([]);
  const [activeIndex, setActiveIndex] = React.useState(0);
  const [loading, setLoading] = React.useState(false);
  const [pendingCaret, setPendingCaret] = React.useState<number | null>(null);
  const internalRef = React.useRef<HTMLTextAreaElement | null>(null);
  // Monotonic guard so a stale onQueryFiles resolution can't clobber a newer one.
  const querySeq = React.useRef(0);
  // Last query dispatched to the provider; avoids re-querying (and resetting the
  // highlighted option) when only the caret moved within the same mention.
  const lastQuery = React.useRef<string | null>(null);
  const listboxId = React.useId();

  // Setup
  const isControlled = controlledDraft !== undefined;
  const draft = isControlled ? controlledDraft : internalDraft;
  const mentionEnabled =
    mentionProvider !== undefined && !disabled && !readOnly;
  const popoverOpen = mentionEnabled && mention !== null;
  const optionId = (index: number): string => `${listboxId}-opt-${index}`;

  // Handlers
  const setDraft = (value: string): void => {
    if (!isControlled) {
      setInternalDraft(value);
    }
    onDraftChange?.(value);
  };

  const closeMention = (): void => {
    querySeq.current += 1;
    lastQuery.current = null;
    setMention(null);
    setResults([]);
    setLoading(false);
    setActiveIndex(0);
  };

  const runQuery = (query: string): void => {
    if (!mentionProvider) {
      return;
    }
    const seq = (querySeq.current += 1);
    setLoading(true);
    mentionProvider
      .onQueryFiles(query)
      .then((paths) => {
        if (seq !== querySeq.current) {
          return;
        }
        setResults(paths);
        setActiveIndex(0);
        setLoading(false);
      })
      .catch(() => {
        if (seq !== querySeq.current) {
          return;
        }
        setResults([]);
        setLoading(false);
      });
  };

  const refreshMention = (value: string, caret: number): void => {
    if (!mentionEnabled) {
      return;
    }
    const next = detectActiveMention(value, caret);
    if (!next) {
      if (mention !== null) {
        closeMention();
      }
      return;
    }
    setMention(next);
    // Only (re)query when the query text actually changed, so caret-only moves
    // within a mention keep the current results and highlighted option.
    if (lastQuery.current !== next.query) {
      lastQuery.current = next.query;
      runQuery(next.query);
    }
  };

  const selectOption = (path: string): void => {
    if (!mention) {
      return;
    }
    const el = internalRef.current;
    const caret =
      el?.selectionStart ?? mention.anchor + 1 + mention.query.length;
    const inserted = insertFileMention(draft, mention.anchor, caret, path);
    setDraft(inserted.value);
    setPendingCaret(inserted.caret);
    closeMention();
  };

  const submitDraft = (): void => {
    const trimmed = draft.trim();
    if (!trimmed || disabled || isStreaming || readOnly) {
      return;
    }
    onSubmit(trimmed);
    setDraft('');
    closeMention();
  };

  const onFormSubmit = (event: React.FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    submitDraft();
  };

  const onTextAreaChange = (
    event: React.ChangeEvent<HTMLTextAreaElement>,
  ): void => {
    const { selectionStart, value } = event.target;
    setDraft(value);
    refreshMention(value, selectionStart ?? value.length);
  };

  const syncCaret = (el: HTMLTextAreaElement): void => {
    refreshMention(el.value, el.selectionStart ?? el.value.length);
  };

  const onTextAreaKeyUp = (
    event: React.KeyboardEvent<HTMLTextAreaElement>,
  ): void => {
    // Re-detect only on caret-movement keys. Popover-control keys (Arrow up/down,
    // Enter, Escape, Tab) are handled in keydown; syncing here would re-open a
    // just-dismissed popover or reset the highlighted option.
    if (!mentionEnabled || !CARET_MOVEMENT_KEYS.has(event.key)) {
      return;
    }
    syncCaret(event.currentTarget);
  };

  const onTextAreaClick = (
    event: React.MouseEvent<HTMLTextAreaElement>,
  ): void => {
    if (!mentionEnabled) {
      return;
    }
    syncCaret(event.currentTarget);
  };

  const onTextAreaKeyDown = (
    event: React.KeyboardEvent<HTMLTextAreaElement>,
  ): void => {
    if (popoverOpen) {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeMention();
        return;
      }
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        if (results.length > 0) {
          setActiveIndex((index) => (index + 1) % results.length);
        }
        return;
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        if (results.length > 0) {
          setActiveIndex(
            (index) => (index - 1 + results.length) % results.length,
          );
        }
        return;
      }
      if ((event.key === 'Enter' && !event.shiftKey) || event.key === 'Tab') {
        if (results.length > 0) {
          event.preventDefault();
          selectOption(results[activeIndex]);
          return;
        }
        if (event.key === 'Enter') {
          // No matches: swallow Enter to dismiss the popover rather than send.
          event.preventDefault();
          closeMention();
          return;
        }
      }
    }

    if (event.key !== 'Enter' || event.shiftKey) {
      return;
    }

    event.preventDefault();
    submitDraft();
  };

  const setRefs = (node: HTMLTextAreaElement | null): void => {
    internalRef.current = node;
    if (typeof textAreaRef === 'function') {
      textAreaRef(node);
    } else if (textAreaRef) {
      textAreaRef.current = node;
    }
  };

  // Markup

  // Life Cycle
  React.useLayoutEffect(() => {
    if (pendingCaret === null || internalRef.current === null) {
      return;
    }
    internalRef.current.focus();
    internalRef.current.setSelectionRange(pendingCaret, pendingCaret);
    setPendingCaret(null);
  }, [pendingCaret]);

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
          onChange={onTextAreaChange}
          onClick={onTextAreaClick}
          onKeyDown={onTextAreaKeyDown}
          onKeyUp={onTextAreaKeyUp}
          placeholder={placeholder}
          readOnly={readOnly}
          ref={setRefs}
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
            onHoverOption={setActiveIndex}
            onSelectOption={selectOption}
            optionId={optionId}
            results={results}
          />
        ) : null}
      </div>
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
