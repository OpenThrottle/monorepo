/**
 * @description Map a whole take's word timings onto sentence boundaries.
 *
 * The take is one request, so the only evidence of where a sentence starts and ends
 * is the word stream. Words are matched to sentences on NORMALISED CHARACTERS, not
 * token counts: the lexicon turns `MCP` into `M C P`, which the service may return
 * as one word or as three, and a count-based match would desync on either.
 *
 * Nothing here falls back to proportional splitting. A stream that cannot be
 * reconciled with the sentences fails with the sentence index and the words it
 * could not place, because a wrong cut is audible and a loud failure is not.
 */

import type { WordTiming } from './types.ts';

/** Segments must sum to the take within one frame (30 fps is the loosest format). */
export const FRAME_SECONDS = 1 / 30;

/** Below this a gap between two words is not measurable on the 80 ms grid. */
const MEASURABLE_GAP_SECONDS = 0.001;

export interface SentenceSpan {
  /** Cut-to-cut start in the take; 0 for the first sentence. */
  readonly endSeconds: number;
  readonly firstWordIndex: number;
  readonly lastWordIndex: number;
  readonly startSeconds: number;
}

export interface MapWordsFailure {
  readonly message: string;
  /** Index of the sentence (in the order passed) that could not be matched. */
  readonly sentenceIndex: number;
  /** The words that could not be placed, as returned by the service. */
  readonly unmatchedWords: readonly string[];
}

export type MapWordsResult =
  | { readonly ok: false; readonly failure: MapWordsFailure }
  | { readonly ok: true; readonly spans: readonly SentenceSpan[] };

/**
 * @description Lowercase and keep only letters and digits, for matching only.
 * Punctuation, whitespace and dashes vanish, so `M C P` and `MCP` agree.
 */
export const normalizeForMatch = (text: string): string => {
  return text.toLowerCase().replaceAll(/[^\p{L}\p{N}]/gu, '');
};

const fail = (
  sentenceIndex: number,
  message: string,
  unmatchedWords: readonly string[],
): MapWordsResult => {
  return { failure: { message, sentenceIndex, unmatchedWords }, ok: false };
};

/** The cut between two sentences: gap midpoint, else the next word's start. */
const cutBetween = (last: WordTiming, next: WordTiming): number => {
  const gap = next.startSeconds - last.endSeconds;

  return gap > MEASURABLE_GAP_SECONDS
    ? last.endSeconds + gap / 2
    : next.startSeconds;
};

/**
 * @description Walk the word stream in order against each sentence's spoken text.
 * Returns each sentence's first and last word and its cut-to-cut span, which starts
 * at 0 for the first sentence and ends at `takeDurationSeconds` for the last, so the
 * spans sum to the take.
 */
export const mapWordsToSentences = (
  sentences: readonly { readonly spoken: string }[],
  words: readonly WordTiming[],
  takeDurationSeconds: number,
): MapWordsResult => {
  const matched: { first: number; last: number }[] = [];
  let cursor = 0;

  for (const [sentenceIndex, sentence] of sentences.entries()) {
    const target = normalizeForMatch(sentence.spoken);

    if (target.length === 0) {
      return fail(
        sentenceIndex,
        `sentence ${String(sentenceIndex)} has no spoken characters (${JSON.stringify(sentence.spoken)})`,
        [],
      );
    }

    const first = cursor;
    let seen = '';

    // A word with no letter or digit (an em dash) is never timed by the service,
    // but tolerate one if it shows up: it contributes nothing and is skipped.
    while (seen.length < target.length) {
      const word = words[cursor];

      if (word === undefined) {
        return fail(
          sentenceIndex,
          `the word stream ended inside sentence ${String(sentenceIndex)}: matched ${JSON.stringify(seen)} of ${JSON.stringify(target)}`,
          words.slice(first).map((entry) => entry.text),
        );
      }

      seen += normalizeForMatch(word.text);
      cursor += 1;

      if (!target.startsWith(seen)) {
        return fail(
          sentenceIndex,
          `sentence ${String(sentenceIndex)} expected ${JSON.stringify(target)} but the words so far are ${JSON.stringify(seen)}`,
          words.slice(first, cursor).map((entry) => entry.text),
        );
      }
    }

    matched.push({ first, last: cursor - 1 });
  }

  const leftover = words.slice(cursor);

  if (leftover.some((word) => normalizeForMatch(word.text).length > 0)) {
    return fail(
      sentences.length - 1,
      `${String(leftover.length)} words remain after the last sentence`,
      leftover.map((word) => word.text),
    );
  }

  const spans: SentenceSpan[] = [];
  let start = 0;

  for (const [index, entry] of matched.entries()) {
    const next = matched[index + 1];
    const last = words[entry.last];
    const nextFirst = next === undefined ? undefined : words[next.first];
    const isFinal = last === undefined || nextFirst === undefined;
    const end = isFinal ? takeDurationSeconds : cutBetween(last, nextFirst);

    if (end <= start) {
      return fail(
        index,
        `sentence ${String(index)} has a non-positive span (${start.toFixed(3)}s to ${end.toFixed(3)}s)`,
        words.slice(entry.first, entry.last + 1).map((word) => word.text),
      );
    }

    spans.push({
      endSeconds: end,
      firstWordIndex: entry.first,
      lastWordIndex: entry.last,
      startSeconds: start,
    });
    start = end;
  }

  const last = words[matched.at(-1)?.last ?? 0];

  if (
    last !== undefined &&
    last.endSeconds > takeDurationSeconds + FRAME_SECONDS
  ) {
    return fail(
      sentences.length - 1,
      `the last word ends at ${last.endSeconds.toFixed(3)}s, past the ${takeDurationSeconds.toFixed(3)}s take`,
      [last.text],
    );
  }

  return { ok: true, spans };
};

/**
 * @description Assert the spans tile the take: start at 0, join end to start, and
 * end at the take duration, so durations sum to the take within one frame.
 */
export const assertSpansCoverTake = (
  spans: readonly SentenceSpan[],
  takeDurationSeconds: number,
): void => {
  const total = spans.reduce(
    (sum, span) => sum + (span.endSeconds - span.startSeconds),
    0,
  );

  if (Math.abs(total - takeDurationSeconds) > FRAME_SECONDS) {
    throw new Error(
      `narrate: segments sum to ${total.toFixed(3)}s but the take is ${takeDurationSeconds.toFixed(3)}s`,
    );
  }
};
