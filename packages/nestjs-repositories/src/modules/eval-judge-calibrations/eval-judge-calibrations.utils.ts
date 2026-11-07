import type { EvalLabelVerdict } from '../eval-human-labels/eval-human-labels.types.ts';

/**
 * @description Collapses the raters' verdicts on one trajectory into one label. Returns the verdict
 * when every rater agrees, and null when there is no label or the raters disagree.
 */
export const consensusLabel = (
  verdicts: readonly EvalLabelVerdict[],
): EvalLabelVerdict | null => {
  const [first] = verdicts;

  if (first === undefined) return null;

  return verdicts.every((verdict) => verdict === first) ? first : null;
};
