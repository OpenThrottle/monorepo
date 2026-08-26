/**
 * @description Everything the old format stored as a field and had to keep in
 * sync by rewriting its own source file.
 *
 * `scripts/validate-video-scripts.ts` counted the narration words and then wrote
 * `spokenWords` back into the markdown it had just read — a derived value living
 * as source, with a `--check` mode whose only job was to notice that the file and
 * its own field had diverged. None of these are fields now.
 *
 * The arithmetic is deliberately identical to the validator's, down to the word
 * filter and the rounding, so the migration cannot silently change a count.
 */

import { applyLexicon } from '../narrate/lexicon';
import { loadFormat } from '../runner/format';
import type { EpisodeFormat, Variant } from './types';
import type { NarrationSentence } from '../narrate/types';

/** Natural narration pace used to convert a word count into seconds. */
export const WORDS_PER_MINUTE = 145;

/**
 * Words that carry sound. A cell of "—" or "…" is punctuation, not narration,
 * so a token has to contain a letter or a digit to count.
 */
const countWords = (text: string): number =>
  text.split(/\s+/).filter((word) => /[a-z0-9]/i.test(word)).length;

/**
 * Split on sentence-ending punctuation followed by a space and a capital.
 *
 * Naive by design, and it stays naive: narration is written as short declarative
 * sentences with no abbreviations precisely so this remains predictable. Changing
 * it changes where the audio is cut, and therefore every caption timing.
 */
const splitSentences = (text: string): readonly string[] =>
  text
    .split(/(?<=[.!?])\s+(?=[A-Z"'])/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 0);

/**
 * @public Total spoken words in a variant.
 */
export const spokenWords = (variant: Variant): number =>
  variant.narration.reduce((total, [, text]) => total + countWords(text), 0);

/**
 * @public Estimated speech duration, rounded as the validator rounds it.
 *
 * An estimate, not a measurement — the real number comes from the TTS backend
 * and lands in `timings.json`. This is what tells you a script is over budget
 * before you spend a hosted render finding out.
 */
export const estimatedSpokenSeconds = (variant: Variant): number =>
  Math.round((spokenWords(variant) / WORDS_PER_MINUTE) * 60);

/**
 * @public The spoken-word ceiling for a format, derived from `format.json`.
 *
 * Shorts derive from `targetDurationSeconds` (55) rather than the 60-second
 * maximum, which is why the budget is 132 and not 145.
 *
 * **A ceiling, not a target.** Most shorts land 25–35 seconds of speech across 55
 * seconds of picture, and that is correct: the gaps are where the viewer watches
 * the action instead of listening to someone describe it.
 */
export const budgetWords = (format: EpisodeFormat): number => {
  const spec = loadFormat();
  const seconds =
    format === 'short'
      ? (spec.formats.short.targetDurationSeconds ??
        spec.formats.short.maxDurationSeconds)
      : spec.formats.longform.maxDurationSeconds;

  return Math.floor((seconds / 60) * WORDS_PER_MINUTE);
};

/**
 * @public The TTS input, one entry per sentence.
 *
 * Sentences rather than cues are the atomic unit because a re-record of one line
 * should not invalidate a whole take, and per-sentence segmentation gives
 * caption-grade timings for free. `beat` carries the cue's own time — under the
 * typed format a variant owns its timings, so this is the variant's clock, not
 * the episode's beat list.
 */
export const sentences = (variant: Variant): readonly NarrationSentence[] => {
  const collected: NarrationSentence[] = [];

  for (const [t, text] of variant.narration) {
    for (const written of splitSentences(text)) {
      collected.push({
        beat: t,
        index: collected.length,
        spoken: applyLexicon(written),
        written,
      });
    }
  }

  return collected;
};
