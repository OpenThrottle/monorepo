/**
 * @description The time→x scale the whole chart derives from, plus adaptive
 * axis ticks. Pure and DOM-free on purpose: jsdom reports no layout geometry,
 * so this module is where the chart's correctness is actually testable.
 *
 * Everything downstream — span rectangles, marker positions, the now line,
 * collision bucketing — asks this module for pixels. Nothing else may compute
 * an x coordinate.
 */

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export type TimelineScale = {
  /** Window start as epoch ms. */
  readonly fromMs: number;
  /** Milliseconds represented by one pixel. */
  readonly msPerPixel: number;
  /** Window end as epoch ms. */
  readonly toMs: number;
  /** Drawable width in px. */
  readonly width: number;
  /** Epoch ms → x px, clamped to the window. */
  readonly x: (value: Date | number | string) => number;
  /** Epoch ms → x px, unclamped, so a caller can detect an out-of-window row. */
  readonly xUnclamped: (value: Date | number | string) => number;
};

const toMillis = (value: Date | number | string): number =>
  value instanceof Date ? value.getTime() : new Date(value).getTime();

/**
 * Build the scale for a window and a drawable width.
 *
 * A zero or inverted window would divide by zero, and a zero width happens for
 * real on the first render before layout settles, so both degrade to a scale
 * that puts everything at x=0 rather than emitting NaN into the DOM.
 */
export function createTimelineScale(args: {
  readonly from: Date | number | string;
  readonly to: Date | number | string;
  readonly width: number;
}): TimelineScale {
  const fromMs = toMillis(args.from);
  const toMs = toMillis(args.to);
  const width = Math.max(0, args.width);
  const span = toMs - fromMs;
  const usable = span > 0 ? span : 1;

  const xUnclamped = (value: Date | number | string): number =>
    ((toMillis(value) - fromMs) / usable) * width;

  const x = (value: Date | number | string): number => {
    const raw = xUnclamped(value);
    if (Number.isNaN(raw)) return 0;

    return Math.min(width, Math.max(0, raw));
  };

  return {
    fromMs,
    msPerPixel: width > 0 ? usable / width : usable,
    toMs,
    width,
    x,
    xUnclamped,
  };
}

export type TimelineTick = {
  readonly at: number;
  readonly scale: 'day' | 'hour';
  readonly x: number;
};

/**
 * Candidate tick intervals, coarsest last. The first one that yields at most
 * `maxTicks` wins, so a narrow chart thins its own axis instead of overprinting.
 */
const TICK_INTERVALS: readonly { ms: number; scale: 'day' | 'hour' }[] = [
  { ms: HOUR, scale: 'hour' },
  { ms: 3 * HOUR, scale: 'hour' },
  { ms: 6 * HOUR, scale: 'hour' },
  { ms: 12 * HOUR, scale: 'hour' },
  { ms: DAY, scale: 'day' },
  { ms: 2 * DAY, scale: 'day' },
  { ms: 7 * DAY, scale: 'day' },
];

/**
 * Ticks aligned to the interval boundary rather than to the window start, so
 * a 24h window reads 09:00, 12:00, 15:00 rather than 09:37, 12:37, 15:37.
 *
 * Alignment uses the viewer's local offset: a UTC-aligned tick lands mid-hour
 * for anyone on a half-hour offset zone (India, Newfoundland, parts of
 * Australia), which is exactly the sort of thing nobody notices until they do.
 */
export function buildTimelineTicks(
  scale: TimelineScale,
  maxTicks = 12,
): TimelineTick[] {
  const span = scale.toMs - scale.fromMs;
  if (span <= 0 || scale.width <= 0) return [];

  const interval =
    TICK_INTERVALS.find((candidate) => span / candidate.ms <= maxTicks) ??
    TICK_INTERVALS[TICK_INTERVALS.length - 1];

  if (interval === undefined) return [];

  const offsetMs = new Date(scale.fromMs).getTimezoneOffset() * MINUTE;
  const alignedStart =
    Math.ceil((scale.fromMs - offsetMs) / interval.ms) * interval.ms + offsetMs;

  const ticks: TimelineTick[] = [];
  for (let at = alignedStart; at <= scale.toMs; at += interval.ms) {
    ticks.push({ at, scale: interval.scale, x: scale.x(at) });
  }

  return ticks;
}

/**
 * The now line's x, or null when the present is outside the window.
 *
 * `clampPast` exists because a live window is built as `to = now` in the
 * loader, so by the time the chart paints — and for every second the viewer
 * then sits on the page — the present is already *past* the window end. Under
 * the strict rule the line would therefore never render on the one window where
 * it matters most. With `clampPast` the caller states that this window tracks
 * the present, and the line pins to the right edge instead of disappearing.
 *
 * It stays opt-in: a window genuinely in the past must not sprout a "now" line
 * at its right edge, which is precisely what the unconditional version would do.
 */
export function nowLineX(
  scale: TimelineScale,
  now: Date | number,
  options: { readonly clampPast?: boolean } = {},
): number | null {
  const nowMs = typeof now === 'number' ? now : now.getTime();
  if (nowMs < scale.fromMs) return null;

  if (nowMs > scale.toMs) {
    return options.clampPast === true ? scale.width : null;
  }

  return scale.x(nowMs);
}
