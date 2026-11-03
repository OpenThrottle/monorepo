export interface PromptRecallInput {
  readonly direction: 'newer' | 'older';
  readonly draft: string;
  /** Previously sent prompts, oldest first. */
  readonly history: readonly string[];
  /** History index currently shown in the composer, or null when not recalling. */
  readonly recallIndex: number | null;
  readonly selectionEnd: number;
  readonly selectionStart: number;
}

/**
 * @description `index` is the history entry to show, or null when stepping
 * newer past the latest entry (the composer is cleared back to empty).
 */
export interface PromptRecallStep {
  readonly index: number | null;
  readonly value: string;
}

/**
 * @description Resolves an ArrowUp/ArrowDown press in the composer against the
 * sent-prompt history. Returns null when the key should keep its native caret
 * behavior. Recall starts only from an empty composer; once a prompt is
 * recalled, further presses step through history only while the text is still
 * the unedited recalled prompt and the caret (collapsed) sits on the first line
 * (older) or last line (newer), so multi-line prompts stay navigable.
 */
export const resolvePromptRecall = (
  input: PromptRecallInput,
): PromptRecallStep | null => {
  const {
    direction,
    draft,
    history,
    recallIndex,
    selectionEnd,
    selectionStart,
  } = input;

  if (history.length === 0 || selectionStart !== selectionEnd) {
    return null;
  }

  if (draft === '') {
    const latest = history.length - 1;
    const value = history[latest];
    return direction === 'older' && value !== undefined
      ? { index: latest, value }
      : null;
  }

  const isUnedited = recallIndex !== null && history[recallIndex] === draft;
  if (!isUnedited) {
    return null;
  }

  if (direction === 'older') {
    const onFirstLine = !draft.slice(0, selectionStart).includes('\n');
    const value = history[recallIndex - 1];
    return onFirstLine && value !== undefined
      ? { index: recallIndex - 1, value }
      : null;
  }

  const onLastLine = !draft.slice(selectionEnd).includes('\n');
  if (!onLastLine) {
    return null;
  }
  const value = history[recallIndex + 1];
  return value === undefined
    ? { index: null, value: '' }
    : { index: recallIndex + 1, value };
};
