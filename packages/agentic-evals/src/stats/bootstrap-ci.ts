import { mulberry32 } from './prng.ts';

/**
 * @description Options for {@link bootstrapCi}. Defaults: 10,000 resamples, 95% confidence,
 * seed 1, so a report is reproducible unless a seed is deliberately changed.
 * @public
 */
export interface BootstrapCiOptions {
  readonly confidence?: number;
  readonly resamples?: number;
  readonly seed?: number;
}

/**
 * @description A percentile bootstrap interval around the sample mean.
 * @public
 */
export interface BootstrapCi {
  readonly confidence: number;
  readonly lower: number;
  readonly mean: number;
  readonly upper: number;
}

const mean = (values: readonly number[]): number => {
  return (
    values.reduce((sum, value) => {
      return sum + value;
    }, 0) / values.length
  );
};

/**
 * @description Percentile bootstrap CI of the mean: resample `values` with replacement
 * `resamples` times with a seeded PRNG, sort the resample means and read the
 * `(1 - confidence) / 2` and `1 - (1 - confidence) / 2` percentiles. Returns `null` for an empty
 * sample or an invalid option.
 * @public
 */
export const bootstrapCi = (
  values: readonly number[],
  options: BootstrapCiOptions = {},
): BootstrapCi | null => {
  const { confidence = 0.95, resamples = 10000, seed = 1 } = options;

  if (
    values.length === 0 ||
    !(confidence > 0 && confidence < 1) ||
    !Number.isInteger(resamples) ||
    resamples < 1
  ) {
    return null;
  }

  const random = mulberry32(seed);
  const size = values.length;
  const means = Array.from({ length: resamples }, () => {
    let sum = 0;

    for (let i = 0; i < size; i += 1) {
      sum += values[Math.floor(random() * size)] ?? 0;
    }

    return sum / size;
  }).sort((a, b) => {
    return a - b;
  });
  const tail = (1 - confidence) / 2;
  const lowerIndex = Math.floor(tail * resamples);
  const upperIndex = Math.min(
    resamples - 1,
    Math.ceil((1 - tail) * resamples) - 1,
  );

  return {
    confidence,
    lower: means[lowerIndex] ?? 0,
    mean: mean(values),
    upper: means[upperIndex] ?? 0,
  };
};

/**
 * @description A percentile bootstrap interval around a statistic that is not a mean.
 * @public
 */
export interface BootstrapStatisticCi {
  readonly confidence: number;
  readonly lower: number;
  readonly upper: number;
}

/**
 * @description Percentile bootstrap CI of any statistic of a sample (for example Cohen's kappa of
 * label pairs): resample `items` with replacement with the same seeded PRNG as {@link bootstrapCi},
 * evaluate `statistic` on each resample and read the percentiles. Resamples where the statistic is
 * undefined (`null`) are skipped, and the result is `null` when none is defined, for an empty
 * sample or for an invalid option.
 * @public
 */
export const bootstrapStatisticCi = <TItem>(
  items: readonly TItem[],
  statistic: (sample: readonly TItem[]) => number | null,
  options: BootstrapCiOptions = {},
): BootstrapStatisticCi | null => {
  const { confidence = 0.95, resamples = 10000, seed = 1 } = options;

  if (
    items.length === 0 ||
    !(confidence > 0 && confidence < 1) ||
    !Number.isInteger(resamples) ||
    resamples < 1
  ) {
    return null;
  }

  const random = mulberry32(seed);
  const size = items.length;
  const values: number[] = [];

  for (let r = 0; r < resamples; r += 1) {
    const sample: TItem[] = [];

    for (let i = 0; i < size; i += 1) {
      const item = items[Math.floor(random() * size)];

      if (item !== undefined) {
        sample.push(item);
      }
    }

    const value = statistic(sample);

    if (value !== null) {
      values.push(value);
    }
  }

  if (values.length === 0) {
    return null;
  }

  values.sort((a, b) => {
    return a - b;
  });

  const tail = (1 - confidence) / 2;
  const lowerIndex = Math.floor(tail * values.length);
  const upperIndex = Math.min(
    values.length - 1,
    Math.ceil((1 - tail) * values.length) - 1,
  );

  return {
    confidence,
    lower: values[lowerIndex] ?? 0,
    upper: values[upperIndex] ?? 0,
  };
};
