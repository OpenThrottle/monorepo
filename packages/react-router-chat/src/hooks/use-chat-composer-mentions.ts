import * as React from 'react';
import {
  type ActiveFileMention,
  detectActiveMention,
  insertFileMention,
} from '../file-mentions';
import type { ChatMentionProvider } from '../types';

/** Keys that move the caret without editing, so the mention state is re-detected. */
const CARET_MOVEMENT_KEYS = new Set(['ArrowLeft', 'ArrowRight', 'End', 'Home']);

export interface UseChatComposerMentionsOptions {
  readonly disabled: boolean;
  /** Current draft text (controlled or internal — resolved by the composer). */
  readonly draft: string;
  readonly mentionProvider?: ChatMentionProvider;
  readonly readOnly: boolean;
  /** Writes the resolved draft (handles controlled vs uncontrolled). */
  readonly setDraft: (value: string) => void;
  /** Consumer-supplied ref forwarded onto the textarea alongside the internal one. */
  readonly textAreaRef?: React.Ref<HTMLTextAreaElement>;
}

export interface UseChatComposerMentionsResult {
  readonly activeIndex: number;
  /** Popover-navigation keydown; returns true when it consumed the event. */
  readonly handleKeyDown: (
    event: React.KeyboardEvent<HTMLTextAreaElement>,
  ) => boolean;
  readonly listboxId: string;
  readonly loading: boolean;
  /** Whether `@`-mentions are active (provider present and editing allowed). */
  readonly mentionEnabled: boolean;
  readonly onChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
  readonly onClick: (event: React.MouseEvent<HTMLTextAreaElement>) => void;
  readonly onKeyUp: (event: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  readonly optionId: (index: number) => string;
  readonly popoverOpen: boolean;
  /** Dismiss the popover and drop pending results (called after submit). */
  readonly reset: () => void;
  readonly results: readonly string[];
  readonly selectOption: (path: string) => void;
  readonly setActiveIndex: React.Dispatch<React.SetStateAction<number>>;
  readonly setRefs: (node: HTMLTextAreaElement | null) => void;
}

/**
 * @description Owns {@link ChatComposer}'s `@`-mention state machine: detecting
 * the active mention at the caret, querying the provider (with a monotonic guard
 * so stale resolutions can't clobber newer ones), keyboard navigation of the
 * results popover, and inserting the chosen path at the caret. The composer stays
 * a presentational textarea; this hook holds all the mention bookkeeping.
 *
 * @public
 */
export const useChatComposerMentions = (
  options: UseChatComposerMentionsOptions,
): UseChatComposerMentionsResult => {
  const { disabled, draft, mentionProvider, readOnly, setDraft, textAreaRef } =
    options;

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

  const mentionEnabled =
    mentionProvider !== undefined && !disabled && !readOnly;
  const popoverOpen = mentionEnabled && mention !== null;
  const optionId = (index: number): string => `${listboxId}-opt-${index}`;

  const reset = (): void => {
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
        reset();
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
    reset();
  };

  const onChange = (event: React.ChangeEvent<HTMLTextAreaElement>): void => {
    const { selectionStart, value } = event.target;
    setDraft(value);
    refreshMention(value, selectionStart ?? value.length);
  };

  const syncCaret = (el: HTMLTextAreaElement): void => {
    refreshMention(el.value, el.selectionStart ?? el.value.length);
  };

  const onKeyUp = (event: React.KeyboardEvent<HTMLTextAreaElement>): void => {
    // Re-detect only on caret-movement keys. Popover-control keys (Arrow up/down,
    // Enter, Escape, Tab) are handled in keydown; syncing here would re-open a
    // just-dismissed popover or reset the highlighted option.
    if (!mentionEnabled || !CARET_MOVEMENT_KEYS.has(event.key)) {
      return;
    }
    syncCaret(event.currentTarget);
  };

  const onClick = (event: React.MouseEvent<HTMLTextAreaElement>): void => {
    if (!mentionEnabled) {
      return;
    }
    syncCaret(event.currentTarget);
  };

  const handleKeyDown = (
    event: React.KeyboardEvent<HTMLTextAreaElement>,
  ): boolean => {
    if (!popoverOpen) {
      return false;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      reset();
      return true;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (results.length > 0) {
        setActiveIndex((index) => (index + 1) % results.length);
      }
      return true;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (results.length > 0) {
        setActiveIndex(
          (index) => (index - 1 + results.length) % results.length,
        );
      }
      return true;
    }
    if ((event.key === 'Enter' && !event.shiftKey) || event.key === 'Tab') {
      if (results.length > 0) {
        event.preventDefault();
        selectOption(results[activeIndex]);
        return true;
      }
      if (event.key === 'Enter') {
        // No matches: swallow Enter to dismiss the popover rather than send.
        event.preventDefault();
        reset();
        return true;
      }
    }
    return false;
  };

  const setRefs = (node: HTMLTextAreaElement | null): void => {
    internalRef.current = node;
    if (typeof textAreaRef === 'function') {
      textAreaRef(node);
    } else if (textAreaRef) {
      textAreaRef.current = node;
    }
  };

  React.useLayoutEffect(() => {
    if (pendingCaret === null || internalRef.current === null) {
      return;
    }
    internalRef.current.focus();
    internalRef.current.setSelectionRange(pendingCaret, pendingCaret);
    setPendingCaret(null);
  }, [pendingCaret]);

  return {
    activeIndex,
    handleKeyDown,
    listboxId,
    loading,
    mentionEnabled,
    onChange,
    onClick,
    onKeyUp,
    optionId,
    popoverOpen,
    reset,
    results,
    selectOption,
    setActiveIndex,
    setRefs,
  };
};
