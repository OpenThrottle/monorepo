/**
 * @description Unit tests for the time→x scale and the adaptive axis ticks. This
 * is where the chart's geometry is actually verified — jsdom reports no layout,
 * so a rendering test could never assert any of it.
 */

import { describe, expect, it } from 'vitest';
import { buildTimelineTicks, createTimelineScale, nowLineX } from '../scale';

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

const FROM = new Date('2026-09-01T00:00:00Z');
const TO = new Date('2026-09-08T00:00:00Z');

const scale = createTimelineScale({ from: FROM, to: TO, width: 700 });

describe('createTimelineScale', () => {
  it('maps the window start to 0 and the end to the full width', () => {
    expect(scale.x(FROM)).toBe(0);
    expect(scale.x(TO)).toBe(700);
  });

  it('maps the midpoint to half the width', () => {
    const midpoint = new Date('2026-09-04T12:00:00Z');

    expect(scale.x(midpoint)).toBe(350);
  });

  it('accepts a Date, an ISO string and epoch millis alike', () => {
    const midpoint = new Date('2026-09-04T12:00:00Z');

    expect(scale.x(midpoint)).toBe(350);
    expect(scale.x(midpoint.toISOString())).toBe(350);
    expect(scale.x(midpoint.getTime())).toBe(350);
  });

  it('clamps a value before the window to 0 and after it to the width', () => {
    expect(scale.x(new Date('2026-08-01T00:00:00Z'))).toBe(0);
    expect(scale.x(new Date('2026-10-01T00:00:00Z'))).toBe(700);
  });

  it('reports the unclamped position so callers can detect clipping', () => {
    expect(scale.xUnclamped(new Date('2026-08-31T00:00:00Z'))).toBeLessThan(0);
    expect(scale.xUnclamped(new Date('2026-09-09T00:00:00Z'))).toBeGreaterThan(
      700,
    );
  });

  it('degrades to zero rather than NaN for a zero-width chart', () => {
    const collapsed = createTimelineScale({ from: FROM, to: TO, width: 0 });

    expect(collapsed.x(TO)).toBe(0);
    expect(Number.isNaN(collapsed.x(TO))).toBe(false);
  });

  it('degrades rather than dividing by zero for an inverted window', () => {
    const inverted = createTimelineScale({ from: TO, to: FROM, width: 700 });

    expect(Number.isFinite(inverted.x(FROM))).toBe(true);
  });

  it('returns 0 for an unparseable value rather than emitting NaN', () => {
    expect(scale.x('not-a-date')).toBe(0);
  });

  it('reports milliseconds per pixel', () => {
    expect(scale.msPerPixel).toBe((7 * DAY) / 700);
  });
});

describe('buildTimelineTicks', () => {
  it('uses hour-scale ticks for a 24-hour window', () => {
    const day = createTimelineScale({
      from: new Date('2026-09-07T00:00:00Z'),
      to: new Date('2026-09-08T00:00:00Z'),
      width: 700,
    });

    const ticks = buildTimelineTicks(day);

    expect(ticks.length).toBeGreaterThan(0);
    expect(ticks.every((tick) => tick.scale === 'hour')).toBe(true);
  });

  it('uses day-scale ticks for a 30-day window', () => {
    const month = createTimelineScale({
      from: new Date('2026-08-09T00:00:00Z'),
      to: new Date('2026-09-08T00:00:00Z'),
      width: 700,
    });

    const ticks = buildTimelineTicks(month);

    expect(ticks.every((tick) => tick.scale === 'day')).toBe(true);
  });

  it('never emits more ticks than the cap', () => {
    const ticks = buildTimelineTicks(scale, 6);

    expect(ticks.length).toBeLessThanOrEqual(6);
  });

  it('thins further for a tighter cap rather than overprinting', () => {
    expect(buildTimelineTicks(scale, 4).length).toBeLessThanOrEqual(
      buildTimelineTicks(scale, 12).length,
    );
  });

  it('places every tick inside the window', () => {
    for (const tick of buildTimelineTicks(scale)) {
      expect(tick.at).toBeGreaterThanOrEqual(scale.fromMs);
      expect(tick.at).toBeLessThanOrEqual(scale.toMs);
      expect(tick.x).toBeGreaterThanOrEqual(0);
      expect(tick.x).toBeLessThanOrEqual(700);
    }
  });

  it('aligns ticks to a local-midnight boundary, not to the window start', () => {
    // Deliberately starts at 03:37 — an unaligned axis would read 03:37, 15:37…
    const offset = createTimelineScale({
      from: new Date('2026-09-01T03:37:00Z'),
      to: new Date('2026-09-08T03:37:00Z'),
      width: 700,
    });

    const first = buildTimelineTicks(offset)[0];

    expect(first).toBeDefined();
    const local = new Date(first?.at ?? 0);
    expect(local.getMinutes()).toBe(0);
  });

  it('returns nothing for a collapsed window', () => {
    const collapsed = createTimelineScale({ from: FROM, to: FROM, width: 700 });

    expect(buildTimelineTicks(collapsed)).toEqual([]);
  });
});

describe('nowLineX', () => {
  it('positions the line when the present is inside the window', () => {
    expect(nowLineX(scale, new Date('2026-09-04T12:00:00Z'))).toBe(350);
  });

  it('returns null when the present is before the window', () => {
    expect(nowLineX(scale, new Date('2026-08-01T00:00:00Z'))).toBeNull();
  });

  it('returns null when the present is after the window', () => {
    expect(nowLineX(scale, new Date('2026-10-01T00:00:00Z'))).toBeNull();
  });

  describe('live windows', () => {
    // A live window is built as `to = now` in the loader, so by paint time the
    // present is always a beat past the end. Without clamping the now line
    // would never render on the one window where it matters.
    it('pins the line to the right edge when the window tracks the present', () => {
      const justPast = new Date(TO.getTime() + 90 * 1000);

      expect(nowLineX(scale, justPast, { clampPast: true })).toBe(700);
    });

    it('still positions the line normally when the present is inside', () => {
      expect(
        nowLineX(scale, new Date('2026-09-04T12:00:00Z'), { clampPast: true }),
      ).toBe(350);
    });

    it('does not pin a window that is genuinely in the past', () => {
      // Opt-in matters: an unconditional clamp would sprout a "now" line at the
      // right edge of every historical window.
      expect(nowLineX(scale, new Date('2026-10-01T00:00:00Z'))).toBeNull();
    });

    it('still returns null before the window even when clamping', () => {
      expect(
        nowLineX(scale, new Date('2026-08-01T00:00:00Z'), { clampPast: true }),
      ).toBeNull();
    });
  });
});
