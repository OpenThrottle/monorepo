import * as React from 'react';

import { resolvePromptRecall } from '../utils/prompt-recall';

export interface UseChatComposerPromptRecallOptions {
  readonly disabled: boolean;
  /** Current draft text (controlled or internal — resolved by the composer). */
  readonly draft: string;
  /**
   * Previously sent prompts, oldest first. Undefined falls back to the prompts
   * reported through {@link UseChatComposerPromptRecallResult.onSent}.
   */
  readonly history: readonly string[] | undefined;
  readonly readOnly: boolean;
  /** Writes the resolved draft (handles controlled vs uncontrolled). */
  readonly setDraft: (value: string) => void;
}

export interface UseChatComposerPromptRecallResult {
  /** ArrowUp/ArrowDown history keydown; returns true when it consumed the event. */
  readonly handleKeyDown: (
    event: React.KeyboardEvent<HTMLTextAreaElement>,
  ) => boolean;
  /** Record a sent prompt and forget the recalled position (called after submit). */
  readonly onSent: (prompt: string) => void;
}

/**
 * @description Shell-style prompt recall for {@link ChatComposer}: ArrowUp in an
 * empty composer brings back the last sent prompt, and further ArrowUp/ArrowDown
 * presses walk the history while the recalled text is unedited and the caret is
 * on its first/last line. The guards live in {@link resolvePromptRecall}; this
 * hook tracks the recalled index and parks the caret at the end of the text.
 *
 * @public
 */
export const useChatComposerPromptRecall = (
  options: UseChatComposerPromptRecallOptions,
): UseChatComposerPromptRecallResult => {
  const { disabled, draft, readOnly, setDraft } = options;

  // Hooks
  const [recallIndex, setRecallIndex] = React.useState<number | null>(null);
  const [sentPrompts, setSentPrompts] = React.useState<readonly string[]>([]);
  const pendingCaretNode = React.useRef<HTMLTextAreaElement | null>(null);

  // Setup
  const effectiveHistory = options.history ?? sentPrompts;

  // Handlers
  const onSent = (prompt: string): void => {
    setSentPrompts((previous) => [...previous, prompt]);
    setRecallIndex(null);
  };

  const handleKeyDown = (
    event: React.KeyboardEvent<HTMLTextAreaElement>,
  ): boolean => {
    const isArrow = event.key === 'ArrowUp' || event.key === 'ArrowDown';
    const hasModifier =
      event.altKey || event.ctrlKey || event.metaKey || event.shiftKey;
    if (
      !isArrow ||
      hasModifier ||
      disabled ||
      readOnly ||
      event.nativeEvent.isComposing
    ) {
      return false;
    }

    const textArea = event.currentTarget;
    const step = resolvePromptRecall({
      direction: event.key === 'ArrowUp' ? 'older' : 'newer',
      draft,
      history: effectiveHistory,
      recallIndex,
      selectionEnd: textArea.selectionEnd,
      selectionStart: textArea.selectionStart,
    });
    if (step === null) {
      return false;
    }

    event.preventDefault();
    setRecallIndex(step.index);
    pendingCaretNode.current = textArea;
    setDraft(step.value);
    return true;
  };

  // Markup

  // Life Cycle
  // Park the caret at the end of the recalled text once it has rendered.
  React.useLayoutEffect(() => {
    const textArea = pendingCaretNode.current;
    if (textArea === null) {
      return;
    }
    pendingCaretNode.current = null;
    textArea.setSelectionRange(textArea.value.length, textArea.value.length);
  }, [draft]);

  // 🔌 Short Circuit

  return { handleKeyDown, onSent };
};
