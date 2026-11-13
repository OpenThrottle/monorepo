const isValidCounts = (n: number, c: number, k: number): boolean => {
  return (
    Number.isInteger(n) &&
    Number.isInteger(c) &&
    Number.isInteger(k) &&
    k >= 1 &&
    k <= n &&
    c >= 0 &&
    c <= n
  );
};

/**
 * @description Unbiased pass@k from `n` attempts of which `c` passed: `1 - C(n-c, k) / C(n, k)`,
 * the probability that at least one of `k` attempts drawn without replacement passes (Chen et al.
 * 2021, "Evaluating Large Language Models Trained on Code"). Computed as the numerically stable
 * product `1 - prod_{i=n-c+1..n} (1 - k / i)` from the paper's Appendix A. `null` for invalid
 * counts (`k` outside 1..n, `c` outside 0..n).
 * @public
 */
export const passAtK = (n: number, c: number, k: number): number | null => {
  if (!isValidCounts(n, c, k)) {
    return null;
  }

  if (n - c < k) {
    return 1;
  }

  let allFail = 1;

  for (let i = n - c + 1; i <= n; i += 1) {
    allFail *= 1 - k / i;
  }

  return 1 - allFail;
};

/**
 * @description pass^k: the probability that all `k` attempts pass, estimated from `n` attempts of
 * which `c` passed as `C(c, k) / C(n, k)`, which is the tau-bench definition (Yao et al. 2024)
 * averaged per task. `null` for invalid counts.
 * @public
 */
export const passHatK = (n: number, c: number, k: number): number | null => {
  if (!isValidCounts(n, c, k)) {
    return null;
  }

  let allPass = 1;

  for (let i = 0; i < k; i += 1) {
    allPass *= (c - i) / (n - i);
  }

  return Math.max(0, allPass);
};

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

/**
 * @description The two facts cost per success needs about a trial.
 * @public
 */
export interface CostedTrial {
  readonly costUsd: number | null;
  readonly passed: boolean;
}

/**
 * @description Total cost of all trials (failures included) divided by the passing trials: what
 * one successful outcome costs. `null` when any trial is unpriced, because a partial total would
 * understate it, or when nothing passed.
 * @public
 */
export const costPerSuccess = (
  trials: readonly CostedTrial[],
): number | null => {
  const passes = trials.filter((trial) => {
    return trial.passed;
  }).length;
  let total = 0;

  for (const trial of trials) {
    if (trial.costUsd === null) {
      return null;
    }

    total += trial.costUsd;
  }

  return passes === 0 ? null : total / passes;
};
