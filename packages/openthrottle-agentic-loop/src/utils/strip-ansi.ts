import { ANSI_PARTIAL_TAIL_PATTERN, ANSI_PATTERN } from '../data/data.ansi.ts';

export interface AnsiStripStream {
  /** Drops a truncated trailing escape; call once at the end of the stream. */
  flush(): void;
  push(text: string): void;
}

/**
 * @description Removes ANSI CSI escape sequences from `text`.
 * @public
 */
export const stripAnsi = (text: string): string => {
  return text.replace(ANSI_PATTERN, '');
};

/**
 * @description Streaming `stripAnsi`: an escape sequence split across two pushes is held back
 * until it completes, so no half of a sequence ever reaches `emit`.
 * @public
 */
export const createAnsiStripStream = (
  emit: (text: string) => void,
): AnsiStripStream => {
  let pending = '';

  const push = (text: string): void => {
    const combined = `${pending}${text}`;
    const partial = ANSI_PARTIAL_TAIL_PATTERN.exec(combined);
    const safeLength = partial === null ? combined.length : partial.index;

    pending = combined.slice(safeLength);

    const clean = stripAnsi(combined.slice(0, safeLength));

    if (clean !== '') {
      emit(clean);
    }
  };

  const flush = (): void => {
    // At end of stream a held-back partial is a truncated escape: drop it, never leak it.
    pending = '';
  };

  return { flush, push };
};
