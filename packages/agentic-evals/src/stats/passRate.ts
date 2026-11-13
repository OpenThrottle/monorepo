/**
 * @description What a pass rate counts. A `GraderVerdict` fits, and so does a `usage_limited`
 * trial.
 * @public
 */
export interface PassRateOutcome {
  readonly kind: 'error' | 'fail' | 'pass' | 'usage_limited';
}

/**
 * @description `rate` is `passes / n`, or `null` when nothing was gradable. `excluded` counts the
 * `error` and `usage_limited` entries that were left out of `n`.
 * @public
 */
export interface PassRate {
  readonly excluded: number;
  readonly n: number;
  readonly passes: number;
  readonly rate: number | null;
}

/**
 * @description Pass rate over verdicts, leaving out `error` (the grader could not decide) and
 * `usage_limited` (the trial never finished): neither says anything about the agent.
 * @public
 */
export const passRate = (outcomes: readonly PassRateOutcome[]): PassRate => {
  const gradable = outcomes.filter((outcome) => {
    return outcome.kind === 'pass' || outcome.kind === 'fail';
  });
  const passes = gradable.filter((outcome) => {
    return outcome.kind === 'pass';
  }).length;
  const n = gradable.length;

  return {
    excluded: outcomes.length - n,
    n,
    passes,
    rate: n === 0 ? null : passes / n,
  };
};
