/**
 * @description Pixel geometry for a single span: where it starts, how wide it
 * is, and whether either end was cut off by the window.
 *
 * Separated from rendering so the clipping and minimum-width rules are unit
 * tested rather than eyeballed — a span silently cut at the window edge, or one
 * too narrow to click, is exactly the kind of bug a screenshot does not catch.
 */

import {
  TIMELINE_LANE_ROW_HEIGHT,
  TIMELINE_MIN_SPAN_WIDTH,
  TIMELINE_SPAN_HEIGHT,
} from '../config/layout';
import type { TimelineScale } from './scale';
import type { TimelineSpan } from '../types';

export type TimelineSpanRect = {
  /** TRUE when the span runs past the window end. */
  readonly clippedEnd: boolean;
  /** TRUE when the span began before the window start. */
  readonly clippedStart: boolean;
  readonly height: number;
  /** TRUE when the real width was below the minimum and had to be widened. */
  readonly widened: boolean;
  readonly width: number;
  readonly x: number;
  readonly y: number;
};

/**
 * Place a span inside its lane.
 *
 * Width is floored at {@link TIMELINE_MIN_SPAN_WIDTH}: a run that took two
 * seconds inside a 30-day window is a fraction of a pixel wide, and a bar you
 * cannot hit is the same as a bar that is not there. `widened` reports when
 * that floor was applied so the tooltip can say the bar is not to scale.
 */
export function spanRect(args: {
  readonly scale: TimelineScale;
  readonly span: TimelineSpan;
  readonly subRow: number;
}): TimelineSpanRect {
  const { scale, span, subRow } = args;

  const rawStart = scale.xUnclamped(span.startsAt);
  const rawEnd = scale.xUnclamped(span.endsAt);

  const x = Math.min(scale.width, Math.max(0, rawStart));
  // An inverted span (end before start) would otherwise produce a negative
  // width and an SVG rect that silently refuses to render.
  const end = Math.min(scale.width, Math.max(x, rawEnd));
  const rawWidth = end - x;
  const widened = rawWidth < TIMELINE_MIN_SPAN_WIDTH;

  return {
    clippedEnd: rawEnd > scale.width,
    clippedStart: rawStart < 0,
    height: TIMELINE_SPAN_HEIGHT,
    widened,
    width: widened ? TIMELINE_MIN_SPAN_WIDTH : rawWidth,
    x,
    y:
      subRow * TIMELINE_LANE_ROW_HEIGHT +
      (TIMELINE_LANE_ROW_HEIGHT - TIMELINE_SPAN_HEIGHT) / 2,
  };
}

/**
 * Opacity modifier for a span's status. Colour encodes *kind*; status only
 * modulates it, so a failed plan run still reads as a plan run rather than
 * turning into a different-looking thing.
 */
export function spanStatusOpacity(status: string | null | undefined): number {
  if (status == null) return 1;

  const normalized = status.toLowerCase();
  if (normalized === 'failed' || normalized === 'cancelled') return 0.45;
  if (normalized === 'canceled') return 0.45;
  if (normalized === 'queued') return 0.6;

  return 1;
}
