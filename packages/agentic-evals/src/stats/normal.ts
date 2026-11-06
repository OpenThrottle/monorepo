/**
 * @description Complementary error function, accurate to about 1e-12 relative error: a positive
 * Taylor series for |x| < 2 and a continued fraction beyond it.
 * @public
 */
export const erfc = (x: number): number => {
  if (x < 0) {
    return 2 - erfc(-x);
  }

  if (x < 2) {
    let term = x;
    let sum = x;

    for (let n = 1; n < 200; n += 1) {
      term *= (2 * x * x) / (2 * n + 1);
      sum += term;

      if (term < sum * 1e-17) {
        break;
      }
    }

    return 1 - (2 / Math.sqrt(Math.PI)) * Math.exp(-x * x) * sum;
  }

  let tail = x;

  for (let k = 80; k >= 1; k -= 1) {
    tail = x + k / 2 / tail;
  }

  return Math.exp(-x * x) / (Math.sqrt(Math.PI) * tail);
};

/**
 * @description Standard normal CDF.
 * @public
 */
export const normalCdf = (x: number): number => {
  return 0.5 * erfc(-x / Math.SQRT2);
};

const ACKLAM_A = [
  -3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2,
  1.38357751867269e2, -3.066479806614716e1, 2.506628277459239,
] as const;
const ACKLAM_B = [
  -5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2,
  6.680131188771972e1, -1.328068155288572e1,
] as const;
const ACKLAM_C = [
  -7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838,
  -2.549732539343734, 4.374664141464968, 2.938163982698783,
] as const;
const ACKLAM_D = [
  7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996,
  3.754408661907416,
] as const;

const polynomial = (coefficients: readonly number[], x: number): number => {
  return coefficients.reduce((acc, coefficient) => {
    return acc * x + coefficient;
  }, 0);
};

const acklamInitial = (p: number): number => {
  const low = 0.02425;

  if (p < low) {
    const q = Math.sqrt(-2 * Math.log(p));

    return polynomial(ACKLAM_C, q) / (polynomial(ACKLAM_D, q) * q + 1);
  }

  if (p > 1 - low) {
    const q = Math.sqrt(-2 * Math.log(1 - p));

    return -(polynomial(ACKLAM_C, q) / (polynomial(ACKLAM_D, q) * q + 1));
  }

  const q = p - 0.5;
  const r = q * q;

  return (polynomial(ACKLAM_A, r) * q) / (polynomial(ACKLAM_B, r) * r + 1);
};

/**
 * @description Inverse standard normal CDF (the z quantile) for `p` in (0, 1), or `null` outside
 * it. Acklam's rational approximation refined with one Halley step, good to about 1e-15.
 * @public
 */
export const normalQuantile = (p: number): number | null => {
  if (!(p > 0 && p < 1)) {
    return null;
  }

  const x = acklamInitial(p);
  const error = normalCdf(x) - p;
  const u = error * Math.sqrt(2 * Math.PI) * Math.exp((x * x) / 2);

  return x - u / (1 + (x * u) / 2);
};
