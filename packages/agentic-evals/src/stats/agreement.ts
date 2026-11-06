/**
 * @description A binary label from the judge and from a human for the same trial.
 * @public
 */
export interface LabelPair {
  readonly human: 'fail' | 'pass';
  readonly judge: 'fail' | 'pass';
}

const count = (
  pairs: readonly LabelPair[],
  judge: LabelPair['judge'],
  human: LabelPair['human'],
): number => {
  return pairs.filter((pair) => {
    return pair.judge === judge && pair.human === human;
  }).length;
};

/**
 * @description Cohen's kappa for two binary raters: `(po - pe) / (1 - pe)`, where `po` is observed
 * agreement and `pe` the agreement expected from each rater's marginal rates. `null` for no pairs,
 * or when chance agreement is already 1 (both raters constant), where kappa is undefined.
 * @public
 */
export const cohensKappa = (pairs: readonly LabelPair[]): number | null => {
  const total = pairs.length;

  if (total === 0) {
    return null;
  }

  const bothPass = count(pairs, 'pass', 'pass');
  const bothFail = count(pairs, 'fail', 'fail');
  const judgePass = bothPass + count(pairs, 'pass', 'fail');
  const humanPass = bothPass + count(pairs, 'fail', 'pass');
  const observed = (bothPass + bothFail) / total;
  const expected =
    (judgePass / total) * (humanPass / total) +
    ((total - judgePass) / total) * ((total - humanPass) / total);

  return expected === 1 ? null : (observed - expected) / (1 - expected);
};

/**
 * @description Catch rate: P(judge says fail | human says fail). `null` when the human never
 * failed a trial.
 * @public
 */
export const catchRate = (pairs: readonly LabelPair[]): number | null => {
  const humanFail = count(pairs, 'fail', 'fail') + count(pairs, 'pass', 'fail');

  return humanFail === 0 ? null : count(pairs, 'fail', 'fail') / humanFail;
};

/**
 * @description False-fail rate: P(judge says fail | human says pass). `null` when the human never
 * passed a trial.
 * @public
 */
export const falseFailRate = (pairs: readonly LabelPair[]): number | null => {
  const humanPass = count(pairs, 'fail', 'pass') + count(pairs, 'pass', 'pass');

  return humanPass === 0 ? null : count(pairs, 'fail', 'pass') / humanPass;
};
