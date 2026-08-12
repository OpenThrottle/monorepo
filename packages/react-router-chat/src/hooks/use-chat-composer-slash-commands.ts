import * as React from 'react';
import {
  type ActiveSlashCommand,
  detectActiveSlashCommand,
  insertSlashCommand,
} from '../slash-commands';
import type { ChatSlashCommand, ChatSlashCommandProvider } from '../types';

/** Keys that move the caret without editing, so the command state is re-detected. */
const CARET_MOVEMENT_KEYS = new Set(['ArrowLeft', 'ArrowRight', 'End', 'Home']);

export interface UseChatComposerSlashCommandsOptions {
  readonly disabled: boolean;
  /** Current draft text (controlled or internal — resolved by the composer). */
  readonly draft: string;
  readonly readOnly: boolean;
  /** Writes the resolved draft (handles controlled vs uncontrolled). */
  readonly setDraft: (value: string) => void;
  readonly slashCommandProvider?: ChatSlashCommandProvider;
  /** Consumer-supplied ref forwarded onto the textarea alongside the internal one. */
  readonly textAreaRef?: React.Ref<HTMLTextAreaElement>;
}

export interface UseChatComposerSlashCommandsResult {
  readonly activeIndex: number;
  /** Popover-navigation keydown; returns true when it consumed the event. */
  readonly handleKeyDown: (
    event: React.KeyboardEvent<HTMLTextAreaElement>,
  ) => boolean;
  readonly listboxId: string;
  readonly loading: boolean;
  readonly onChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
  readonly onClick: (event: React.MouseEvent<HTMLTextAreaElement>) => void;
  readonly onKeyUp: (event: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  readonly optionId: (index: number) => string;
  readonly popoverOpen: boolean;
  /** Dismiss the popover and drop pending results (called after submit). */
  readonly reset: () => void;
  readonly results: readonly ChatSlashCommand[];
  readonly selectOption: (slug: string) => void;
  readonly setActiveIndex: React.Dispatch<React.SetStateAction<number>>;
  readonly setRefs: (node: HTMLTextAreaElement | null) => void;
  /** Whether `/`-commands are active (provider present and editing allowed). */
  readonly slashEnabled: boolean;
}

/**
 * @description Owns {@link ChatComposer}'s `/`-command state machine: detecting
 * the leading slash command at the caret, querying the provider (with a monotonic
 * guard so stale resolutions can't clobber newer ones), keyboard navigation of
 * the results popover, and inserting the chosen `/<slug> ` at the caret. Mirrors
 * {@link useChatComposerMentions}; the composer stays a presentational textarea
 * while this hook holds all the slash-command bookkeeping.
 *
 * @public
 */
export const useChatComposerSlashCommands = (
  options: UseChatComposerSlashCommandsOptions,
): UseChatComposerSlashCommandsResult => {
  const {
    disabled,
    draft,
    readOnly,
    setDraft,
    slashCommandProvider,
    textAreaRef,
  } = options;

  const [command, setCommand] = React.useState<ActiveSlashCommand | null>(null);
  const [results, setResults] = React.useState<readonly ChatSlashCommand[]>([]);
  const [activeIndex, setActiveIndex] = React.useState(0);
  const [loading, setLoading] = React.useState(false);
  const [pendingCaret, setPendingCaret] = React.useState<number | null>(null);
  const internalRef = React.useRef<HTMLTextAreaElement | null>(null);
  // Monotonic guard so a stale onQuerySkills resolution can't clobber a newer one.
  const querySeq = React.useRef(0);
  // Last query dispatched to the provider; avoids re-querying (and resetting the
  // highlighted option) when only the caret moved within the same command.
  const lastQuery = React.useRef<string | null>(null);
  const listboxId = React.useId();

  const slashEnabled =
    slashCommandProvider !== undefined && !disabled && !readOnly;
  const popoverOpen = slashEnabled && command !== null;
  const optionId = (index: number): string => `${listboxId}-opt-${index}`;

  const reset = (): void => {
    querySeq.current += 1;
    lastQuery.current = null;
    setCommand(null);
    setResults([]);
    setLoading(false);
    setActiveIndex(0);
  };

  const runQuery = (query: string): void => {
    if (!slashCommandProvider) {
      return;
    }
    const seq = (querySeq.current += 1);
    setLoading(true);
    slashCommandProvider
      .onQuerySkills(query)
      .then((skills) => {
        if (seq !== querySeq.current) {
          return;
        }
        setResults(skills);
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

  const refreshCommand = (value: string, caret: number): void => {
    if (!slashEnabled) {
      return;
    }
    const next = detectActiveSlashCommand(value, caret);
    if (!next) {
      if (command !== null) {
        reset();
      }
      return;
    }
    setCommand(next);
    // Only (re)query when the query text actually changed, so caret-only moves
    // within a command keep the current results and highlighted option.
    if (lastQuery.current !== next.query) {
      lastQuery.current = next.query;
      runQuery(next.query);
    }
  };

  const selectOption = (slug: string): void => {
    if (!command) {
      return;
    }
    const el = internalRef.current;
    const caret =
      el?.selectionStart ?? command.anchor + 1 + command.query.length;
    const inserted = insertSlashCommand(draft, command.anchor, caret, slug);
    setDraft(inserted.value);
    setPendingCaret(inserted.caret);
    reset();
  };

  const onChange = (event: React.ChangeEvent<HTMLTextAreaElement>): void => {
    const { selectionStart, value } = event.target;
    setDraft(value);
    refreshCommand(value, selectionStart ?? value.length);
  };

  const syncCaret = (el: HTMLTextAreaElement): void => {
    refreshCommand(el.value, el.selectionStart ?? el.value.length);
  };

  const onKeyUp = (event: React.KeyboardEvent<HTMLTextAreaElement>): void => {
    // Re-detect only on caret-movement keys. Popover-control keys (Arrow up/down,
    // Enter, Escape, Tab) are handled in keydown; syncing here would re-open a
    // just-dismissed popover or reset the highlighted option.
    if (!slashEnabled || !CARET_MOVEMENT_KEYS.has(event.key)) {
      return;
    }
    syncCaret(event.currentTarget);
  };

  const onClick = (event: React.MouseEvent<HTMLTextAreaElement>): void => {
    if (!slashEnabled) {
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
        selectOption(results[activeIndex].slug);
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
    slashEnabled,
  };
};
