import type {
  BatchedChunkSink,
  BatchedChunkSinkOptions,
  ScheduleClock,
} from '../contract/index.ts';
import { ANSI_PARTIAL_TAIL_PATTERN, ANSI_PATTERN } from '../data/data.ansi.ts';
import {
  NX_TARGET_FLAG_PATTERN,
  NX_TARGET_RUN_PATTERN,
  SUMMARY_EXIT_WORD,
  SUMMARY_GREEN_MARK,
  SUMMARY_LABEL_ELLIPSIS,
  SUMMARY_LABEL_MAX_CHARS,
  SUMMARY_RED_MARK,
  SUMMARY_SEPARATOR,
  SUMMARY_TIMED_OUT_WORD,
} from '../data/data.validation-summary.ts';

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

const MS_PER_SECOND = 1000;
const SECONDS_PER_MINUTE = 60;

/**
 * @description Short name for a validation command: the target list for `nx affected` /
 * `nx run-many`, otherwise the command collapsed to one line and truncated.
 * @public
 */
export const labelForCommand = (command: string): string => {
  if (NX_TARGET_RUN_PATTERN.test(command)) {
    const targets = NX_TARGET_FLAG_PATTERN.exec(command)?.[1];

    if (targets !== undefined) {
      return targets.split(/\s+/).join(',');
    }
  }

  const oneLine = command.replace(/\s+/g, ' ').trim();

  return oneLine.length <= SUMMARY_LABEL_MAX_CHARS
    ? oneLine
    : `${oneLine.slice(0, SUMMARY_LABEL_MAX_CHARS - 1)}${SUMMARY_LABEL_ELLIPSIS}`;
};

/**
 * @description `46s`, or `2m 5s` from a minute up; rounds to whole seconds.
 * @public
 */
export const formatDuration = (durationMs: number): string => {
  const totalSeconds = Math.max(0, Math.round(durationMs / MS_PER_SECOND));
  const minutes = Math.floor(totalSeconds / SECONDS_PER_MINUTE);
  const seconds = totalSeconds % SECONDS_PER_MINUTE;

  return minutes === 0 ? `${seconds}s` : `${minutes}m ${seconds}s`;
};

/** @public */
export type CommandSummaryOutcome =
  | { readonly kind: 'green' }
  | { readonly exitCode: number; readonly kind: 'red' }
  | { readonly kind: 'timed_out' };

const describeRed = (
  outcome: Exclude<CommandSummaryOutcome, { readonly kind: 'green' }>,
): string => {
  if (outcome.kind === 'timed_out') {
    return SUMMARY_TIMED_OUT_WORD;
  }

  return `${SUMMARY_EXIT_WORD} ${outcome.exitCode}`;
};

/**
 * @description One summary line, no trailing newline: `lint ✔ · 46s`, `lint ✗ exit 1 · 54s`,
 * `lint ✗ timed out · 30m 0s`.
 * @public
 */
export const summarizeCommand = (input: {
  readonly command: string;
  readonly durationMs: number;
  readonly outcome: CommandSummaryOutcome;
}): string => {
  const label = labelForCommand(input.command);
  const duration = formatDuration(input.durationMs);

  if (input.outcome.kind === 'green') {
    return `${label} ${SUMMARY_GREEN_MARK} ${SUMMARY_SEPARATOR} ${duration}`;
  }

  const reason = describeRed(input.outcome);

  return `${label} ${SUMMARY_RED_MARK} ${reason} ${SUMMARY_SEPARATOR} ${duration}`;
};

/**
 * @description Batches output text: flushes when the buffer reaches `maxBytes`, or `maxMs` after
 * the first buffered text, whichever comes first (§ 10). Call `flush()` at the end of the stream.
 * @public
 */
export const createBatchedChunkSink = (
  onChunk: (text: string) => void,
  options: BatchedChunkSinkOptions,
  clock: ScheduleClock,
): BatchedChunkSink => {
  let buffer = '';
  let bufferedBytes = 0;
  let cancelTimer: (() => void) | undefined;

  const flush = (): void => {
    cancelTimer?.();
    cancelTimer = undefined;

    if (buffer === '') {
      return;
    }

    const text = buffer;

    buffer = '';
    bufferedBytes = 0;
    onChunk(text);
  };

  const push = (text: string): void => {
    if (text === '') {
      return;
    }

    buffer += text;
    bufferedBytes += Buffer.byteLength(text, 'utf8');

    if (bufferedBytes >= options.maxBytes) {
      flush();

      return;
    }

    if (cancelTimer === undefined) {
      cancelTimer = clock.schedule(flush, options.maxMs);
    }
  };

  return { flush, push };
};
