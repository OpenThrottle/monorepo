/** @public */
export type FormatDurationRounding = 'floor' | 'round';

/** @public */
export type FormatDurationUnit = 'day' | 'hour' | 'minute';

/** @public */
export interface FormatDurationOptions {
  /** Drop the second unit when it is zero (`1h 0m` becomes `1h`). The first unit is always kept. */
  readonly dropZeroTail?: boolean;
  /** The biggest unit shown; anything longer overflows into it (`25h`, `90m`). Default `hour`. */
  readonly largestUnit?: FormatDurationUnit;
  /** How many units to show, counted down from the largest non-zero one. Default `2`. */
  readonly maxUnits?: 1 | 2 | 3 | 4;
  /** Zero-pad every unit after the first to two digits (`3m 05s`). Default `false`. */
  readonly padded?: boolean;
  /** How milliseconds become whole seconds. Default `round`. */
  readonly rounding?: FormatDurationRounding;
}

const SECONDS_PER_UNIT = {
  day: 86_400,
  hour: 3_600,
  minute: 60,
  second: 1,
} as const;

const UNIT_LADDER = [
  { key: 'day', suffix: 'd' },
  { key: 'hour', suffix: 'h' },
  { key: 'minute', suffix: 'm' },
  { key: 'second', suffix: 's' },
] as const;

/**
 * @description Compact elapsed-time text such as `45s`, `3m 5s` or `1h 4m`. Browser-safe (no Node
 * builtins). Negative and non-finite input reads as `0s`. Units start at the largest non-zero
 * one, capped by `largestUnit`, and the seconds unit is always the last possible one.
 * @public
 */
export const formatDuration = (
  ms: number,
  options: FormatDurationOptions = {},
): string => {
  const {
    dropZeroTail = false,
    largestUnit = 'hour',
    maxUnits = 2,
    padded = false,
    rounding = 'round',
  } = options;

  const safeMs = Number.isFinite(ms) ? Math.max(0, ms) : 0;
  const seconds = safeMs / 1000;
  let remaining =
    rounding === 'floor' ? Math.floor(seconds) : Math.round(seconds);

  const ceiling = UNIT_LADDER.findIndex((unit) => unit.key === largestUnit);
  const parts = UNIT_LADDER.slice(ceiling).map((unit) => {
    const value = Math.floor(remaining / SECONDS_PER_UNIT[unit.key]);
    remaining -= value * SECONDS_PER_UNIT[unit.key];

    return { suffix: unit.suffix, value };
  });

  const firstNonZero = parts.findIndex((part) => part.value > 0);
  const start = firstNonZero === -1 ? parts.length - 1 : firstNonZero;
  const shown = parts.slice(start, start + maxUnits);

  return shown
    .filter((part, index) => {
      return !(dropZeroTail && index === 1 && part.value === 0);
    })
    .map((part, index) => {
      const isPadded = padded && index > 0;
      const digits = isPadded
        ? String(part.value).padStart(2, '0')
        : String(part.value);

      return `${digits}${part.suffix}`;
    })
    .join(' ');
};
