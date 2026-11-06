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
