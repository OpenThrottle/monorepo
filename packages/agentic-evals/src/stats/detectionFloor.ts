import { normalQuantile } from './normal.ts';

/**
 * @description Shared options. Defaults: `alpha` 0.05 (two-sided), `power` 0.8, `correlation` 0.
 * `correlation` is how strongly the same case's outcomes agree between the two runs; 0 is the
 * conservative choice and equals the unpaired two-proportion case.
 * @public
 */
export interface DetectionOptions {
  readonly alpha?: number;
  readonly baseRate: number;
  readonly correlation?: number;
  readonly power?: number;
}

/**
 * @description Input of {@link detectionFloor}.
 * @public
 */
export interface DetectionFloorInput extends DetectionOptions {
  readonly n: number;
}

/**
 * @description Input of {@link requiredSampleSize}.
 * @public
 */
export interface RequiredSampleSizeInput extends DetectionOptions {
  readonly minDetectableDifference: number;
}

/**
 * @description `(z_{1-alpha/2} + z_{power})^2 * 2 * p * (1 - p) * (1 - rho)`, the numerator both
 * functions share, or `null` for invalid options.
 */
const effectiveVariance = (options: DetectionOptions): number | null => {
  const { alpha = 0.05, baseRate, correlation = 0, power = 0.8 } = options;
  const zAlpha = normalQuantile(1 - alpha / 2);
  const zPower = normalQuantile(power);

  if (
    zAlpha === null ||
    zPower === null ||
    !(baseRate > 0 && baseRate < 1) ||
    !(correlation >= 0 && correlation < 1)
  ) {
    return null;
  }

  return (
    (zAlpha + zPower) ** 2 * 2 * baseRate * (1 - baseRate) * (1 - correlation)
  );
};

/**
 * @description The smallest difference in pass rate a paired comparison over `n` cases can detect
 * (normal approximation): `delta = (z_{1-alpha/2} + z_{power}) * sqrt(2 p (1 - p) (1 - rho) / n)`.
 * With `rho = 0` this is Lehr's rule, `n = 16 sigma^2 / delta^2` per arm at alpha 0.05 and power
 * 0.8. Anything below the floor is within noise at this dataset size. `null` for invalid input.
 * @public
 */
export const detectionFloor = (input: DetectionFloorInput): number | null => {
  const variance = effectiveVariance(input);

  if (variance === null || !Number.isFinite(input.n) || input.n <= 0) {
    return null;
  }

  return Math.sqrt(variance / input.n);
};

/**
 * @description Inverse of {@link detectionFloor}: the number of cases needed to detect
 * `minDetectableDifference`, `ceil((z_{1-alpha/2} + z_{power})^2 * 2 p (1 - p) (1 - rho) / delta^2)`.
 * `null` for invalid input.
 * @public
 */
export const requiredSampleSize = (
  input: RequiredSampleSizeInput,
): number | null => {
  const variance = effectiveVariance(input);

  if (variance === null || !(input.minDetectableDifference > 0)) {
    return null;
  }

  return Math.ceil(variance / input.minDetectableDifference ** 2);
};
