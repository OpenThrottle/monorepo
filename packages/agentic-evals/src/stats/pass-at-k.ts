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
