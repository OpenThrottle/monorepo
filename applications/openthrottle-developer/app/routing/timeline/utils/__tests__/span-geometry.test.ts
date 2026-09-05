/**
 * @description Unit tests for span pixel geometry: clipping at the window
 * edges, the minimum hit-target floor, and inverted spans. None of this is
 * observable through jsdom, and every case here is a bug a screenshot misses.
 */

import { describe, expect, it } from 'vitest';
import { TimelineSpanKind } from '~/__generated__/graphql';
import { spanRect, spanStatusOpacity } from '../span-geometry';
import { createTimelineScale } from '../scale';
import {
  TIMELINE_LANE_ROW_HEIGHT,
  TIMELINE_MIN_SPAN_WIDTH,
} from '../../config/layout';
import type { TimelineSpan } from '../../types';

const FROM = new Date('2026-09-01T00:00:00Z');
const TO = new Date('2026-09-02T00:00:00Z');
/** 1440 minutes over 1440px — one pixel is exactly one minute. */
const scale = createTimelineScale({ from: FROM, to: TO, width: 1440 });

const span = (
  startsAt: string,
  endsAt: string,
  overrides: Partial<TimelineSpan> = {},
): TimelineSpan => ({
  backend: null,
  branch: null,
  checkoutId: null,
  conversationId: null,
  derivedEnd: false,
  endsAt,
  id: 'span-1',
  kind: TimelineSpanKind.PlanRun,
  laneKey: 'plan:plan-1',
  laneLabel: 'Plan One',
  model: null,
  planId: 'plan-1',
  startsAt,
  status: null,
  title: 'A span',
  ...overrides,
});

describe('spanRect', () => {
  it('positions and sizes a span inside the window', () => {
    const rect = spanRect({
      scale,
      span: span('2026-09-01T01:00:00Z', '2026-09-01T03:00:00Z'),
      subRow: 0,
    });

    expect(rect.x).toBe(60);
    expect(rect.width).toBe(120);
    expect(rect.clippedStart).toBe(false);
    expect(rect.clippedEnd).toBe(false);
  });

  it('offsets by sub-row so overlapping spans stack visibly', () => {
    const first = spanRect({
      scale,
      span: span('2026-09-01T01:00:00Z', '2026-09-01T03:00:00Z'),
      subRow: 0,
    });
    const second = spanRect({
      scale,
      span: span('2026-09-01T01:00:00Z', '2026-09-01T03:00:00Z'),
      subRow: 1,
    });

    expect(second.y - first.y).toBe(TIMELINE_LANE_ROW_HEIGHT);
  });

  it('flags and clamps a span that began before the window', () => {
    const rect = spanRect({
      scale,
      span: span('2026-08-31T20:00:00Z', '2026-09-01T02:00:00Z'),
      subRow: 0,
    });

    expect(rect.clippedStart).toBe(true);
    expect(rect.x).toBe(0);
    expect(rect.width).toBe(120);
  });

  it('flags and clamps a span that runs past the window end', () => {
    const rect = spanRect({
      scale,
      span: span('2026-09-01T22:00:00Z', '2026-09-02T06:00:00Z'),
      subRow: 0,
    });

    expect(rect.clippedEnd).toBe(true);
    expect(rect.x + rect.width).toBe(1440);
  });

  it('flags both ends for a span that spans the whole window', () => {
    const rect = spanRect({
      scale,
      span: span('2026-08-01T00:00:00Z', '2026-10-01T00:00:00Z'),
      subRow: 0,
    });

    expect(rect.clippedStart).toBe(true);
    expect(rect.clippedEnd).toBe(true);
    expect(rect.width).toBe(1440);
  });

  it('widens a sub-pixel span to a clickable minimum and says so', () => {
    const rect = spanRect({
      scale,
      span: span('2026-09-01T01:00:00Z', '2026-09-01T01:00:02Z'),
      subRow: 0,
    });

    expect(rect.widened).toBe(true);
    expect(rect.width).toBe(TIMELINE_MIN_SPAN_WIDTH);
  });

  it('does not widen a span already wide enough to hit', () => {
    const rect = spanRect({
      scale,
      span: span('2026-09-01T01:00:00Z', '2026-09-01T01:30:00Z'),
      subRow: 0,
    });

    expect(rect.widened).toBe(false);
    expect(rect.width).toBe(30);
  });

  it('gives a zero-length span the minimum width rather than vanishing', () => {
    const rect = spanRect({
      scale,
      span: span('2026-09-01T01:00:00Z', '2026-09-01T01:00:00Z'),
      subRow: 0,
    });

    expect(rect.width).toBe(TIMELINE_MIN_SPAN_WIDTH);
  });

  it('never produces a negative width for an inverted span', () => {
    const rect = spanRect({
      scale,
      span: span('2026-09-01T05:00:00Z', '2026-09-01T01:00:00Z'),
      subRow: 0,
    });

    expect(rect.width).toBeGreaterThan(0);
  });

  it('does not flag clipping for a span that exactly fills the window', () => {
    const rect = spanRect({
      scale,
      span: span(FROM.toISOString(), TO.toISOString()),
      subRow: 0,
    });

    expect(rect.clippedStart).toBe(false);
    expect(rect.clippedEnd).toBe(false);
  });
});

describe('spanStatusOpacity', () => {
  it('leaves a span with no status at full strength', () => {
    expect(spanStatusOpacity(null)).toBe(1);
  });

  it('leaves a completed span at full strength', () => {
    expect(spanStatusOpacity('COMPLETED')).toBe(1);
  });

  it('fades a failed span without changing its kind colour', () => {
    expect(spanStatusOpacity('FAILED')).toBeLessThan(1);
  });

  it('handles both spellings of cancelled', () => {
    expect(spanStatusOpacity('cancelled')).toBe(spanStatusOpacity('canceled'));
  });

  it('fades a queued span, which has not started yet', () => {
    expect(spanStatusOpacity('QUEUED')).toBeLessThan(1);
  });
});
