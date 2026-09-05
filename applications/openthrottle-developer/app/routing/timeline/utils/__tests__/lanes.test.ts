/**
 * @description Unit tests for lane assembly: interval packing into sub-rows and
 * marker clustering. The packer is the heart of the view — overlap is the whole
 * reason the chart exists — and none of it is observable through jsdom.
 */

import { describe, expect, it } from 'vitest';
import { TimelineMarkerKind, TimelineSpanKind } from '~/__generated__/graphql';
import {
  buildTimelineLanes,
  clusterMarkers,
  packSpansIntoSubRows,
} from '../lanes';
import { createTimelineScale } from '../scale';
import type { TimelineMarker, TimelineSpan } from '../../types';

const FROM = new Date('2026-09-01T00:00:00Z');
const TO = new Date('2026-09-02T00:00:00Z');
const scale = createTimelineScale({ from: FROM, to: TO, width: 1440 });

const span = (
  id: string,
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
  id,
  kind: TimelineSpanKind.PlanRun,
  laneKey: 'plan:plan-1',
  laneLabel: 'Plan One',
  model: null,
  planId: 'plan-1',
  startsAt,
  status: null,
  title: id,
  ...overrides,
});

const marker = (
  id: string,
  at: string,
  overrides: Partial<TimelineMarker> = {},
): TimelineMarker => ({
  at,
  branch: null,
  id,
  kind: TimelineMarkerKind.GitCommit,
  laneKey: 'plan:plan-1',
  laneLabel: 'Plan One',
  planId: 'plan-1',
  taskId: null,
  title: id,
  url: null,
  ...overrides,
});

const subRowOf = (
  placed: ReturnType<typeof packSpansIntoSubRows>,
  id: string,
): number | undefined => placed.find((entry) => entry.span.id === id)?.subRow;

describe('packSpansIntoSubRows', () => {
  it('keeps non-overlapping spans on one sub-row', () => {
    const placed = packSpansIntoSubRows([
      span('a', '2026-09-01T00:00:00Z', '2026-09-01T01:00:00Z'),
      span('b', '2026-09-01T02:00:00Z', '2026-09-01T03:00:00Z'),
    ]);

    expect(placed.every((entry) => entry.subRow === 0)).toBe(true);
  });

  it('stacks a partially overlapping span onto the next sub-row', () => {
    const placed = packSpansIntoSubRows([
      span('a', '2026-09-01T00:00:00Z', '2026-09-01T02:00:00Z'),
      span('b', '2026-09-01T01:00:00Z', '2026-09-01T03:00:00Z'),
    ]);

    expect(subRowOf(placed, 'a')).toBe(0);
    expect(subRowOf(placed, 'b')).toBe(1);
  });

  it('stacks a fully contained span rather than hiding it', () => {
    const placed = packSpansIntoSubRows([
      span('outer', '2026-09-01T00:00:00Z', '2026-09-01T06:00:00Z'),
      span('inner', '2026-09-01T02:00:00Z', '2026-09-01T03:00:00Z'),
    ]);

    expect(placed).toHaveLength(2);
    expect(subRowOf(placed, 'inner')).toBe(1);
  });

  it('grows to three sub-rows for a three-deep overlap', () => {
    const placed = packSpansIntoSubRows([
      span('a', '2026-09-01T00:00:00Z', '2026-09-01T05:00:00Z'),
      span('b', '2026-09-01T01:00:00Z', '2026-09-01T05:00:00Z'),
      span('c', '2026-09-01T02:00:00Z', '2026-09-01T05:00:00Z'),
    ]);

    expect(new Set(placed.map((entry) => entry.subRow)).size).toBe(3);
  });

  it('reuses a freed sub-row once its span has ended', () => {
    const placed = packSpansIntoSubRows([
      span('a', '2026-09-01T00:00:00Z', '2026-09-01T02:00:00Z'),
      span('b', '2026-09-01T01:00:00Z', '2026-09-01T03:00:00Z'),
      span('c', '2026-09-01T04:00:00Z', '2026-09-01T05:00:00Z'),
    ]);

    expect(subRowOf(placed, 'c')).toBe(0);
  });

  it('places a zero-length span without blocking its sub-row forever', () => {
    const placed = packSpansIntoSubRows([
      span('zero', '2026-09-01T01:00:00Z', '2026-09-01T01:00:00Z'),
      span('after', '2026-09-01T02:00:00Z', '2026-09-01T03:00:00Z'),
    ]);

    expect(subRowOf(placed, 'after')).toBe(0);
  });

  it('treats an inverted span as instantaneous rather than infinite', () => {
    const placed = packSpansIntoSubRows([
      span('inverted', '2026-09-01T05:00:00Z', '2026-09-01T01:00:00Z'),
      span('after', '2026-09-01T06:00:00Z', '2026-09-01T07:00:00Z'),
    ]);

    expect(subRowOf(placed, 'after')).toBe(0);
  });

  it('keeps a span that starts before the window', () => {
    const placed = packSpansIntoSubRows([
      span('clipped', '2026-08-30T00:00:00Z', '2026-09-01T02:00:00Z'),
    ]);

    expect(placed).toHaveLength(1);
    expect(subRowOf(placed, 'clipped')).toBe(0);
  });

  it('sorts by start time rather than trusting input order', () => {
    const placed = packSpansIntoSubRows([
      span('later', '2026-09-01T04:00:00Z', '2026-09-01T05:00:00Z'),
      span('earlier', '2026-09-01T00:00:00Z', '2026-09-01T01:00:00Z'),
    ]);

    expect(placed[0]?.span.id).toBe('earlier');
  });

  it('returns nothing for no spans', () => {
    expect(packSpansIntoSubRows([])).toEqual([]);
  });
});

describe('clusterMarkers', () => {
  it('leaves well-separated markers as singleton clusters', () => {
    const clusters = clusterMarkers(
      [
        marker('a', '2026-09-01T00:00:00Z'),
        marker('b', '2026-09-01T06:00:00Z'),
      ],
      scale,
    );

    expect(clusters).toHaveLength(2);
    expect(clusters.every((cluster) => cluster.markers.length === 1)).toBe(
      true,
    );
  });

  it('buckets markers that collide within the pixel threshold', () => {
    const clusters = clusterMarkers(
      [
        marker('a', '2026-09-01T01:00:00Z'),
        marker('b', '2026-09-01T01:01:00Z'),
        marker('c', '2026-09-01T01:02:00Z'),
      ],
      scale,
    );

    expect(clusters).toHaveLength(1);
    expect(clusters[0]?.markers).toHaveLength(3);
  });

  it('never merges markers of different kinds', () => {
    const clusters = clusterMarkers(
      [
        marker('commit', '2026-09-01T01:00:00Z'),
        marker('task', '2026-09-01T01:00:30Z', {
          kind: TimelineMarkerKind.TaskAdded,
        }),
      ],
      scale,
    );

    expect(clusters).toHaveLength(2);
  });

  it('collapses a dense month into far fewer glyphs than markers', () => {
    const wide = createTimelineScale({
      from: new Date('2026-08-09T00:00:00Z'),
      to: new Date('2026-09-08T00:00:00Z'),
      width: 900,
    });
    const dense = Array.from({ length: 600 }, (_unused, index) =>
      marker(
        `m-${index}`,
        new Date(wide.fromMs + index * 60 * 1000).toISOString(),
      ),
    );

    const clusters = clusterMarkers(dense, wide);

    expect(clusters.length).toBeLessThan(dense.length / 10);
  });

  it('returns clusters in chronological order', () => {
    const clusters = clusterMarkers(
      [
        marker('late', '2026-09-01T20:00:00Z'),
        marker('early', '2026-09-01T02:00:00Z', {
          kind: TimelineMarkerKind.TaskAdded,
        }),
      ],
      scale,
    );

    expect(clusters[0]?.markers[0]?.id).toBe('early');
  });

  it('returns nothing for no markers', () => {
    expect(clusterMarkers([], scale)).toEqual([]);
  });
});

describe('buildTimelineLanes', () => {
  it('groups rows by their server-assigned lane key', () => {
    const lanes = buildTimelineLanes({
      markers: [],
      scale,
      spans: [
        span('a', '2026-09-01T00:00:00Z', '2026-09-01T01:00:00Z'),
        span('b', '2026-09-01T02:00:00Z', '2026-09-01T03:00:00Z', {
          laneKey: 'plan:plan-2',
          laneLabel: 'Plan Two',
        }),
      ],
    });

    expect(lanes.map((lane) => lane.key)).toEqual([
      'plan:plan-1',
      'plan:plan-2',
    ]);
  });

  it('creates a lane that holds only markers', () => {
    const lanes = buildTimelineLanes({
      markers: [
        marker('grill', '2026-09-01T01:00:00Z', {
          kind: TimelineMarkerKind.Grilling,
          laneKey: 'skills',
          laneLabel: 'Skills',
        }),
      ],
      scale,
      spans: [],
    });

    expect(lanes).toHaveLength(1);
    expect(lanes[0]?.key).toBe('skills');
    expect(lanes[0]?.subRowCount).toBe(1);
  });

  it('grows a lane sub-row count to fit its deepest overlap', () => {
    const lanes = buildTimelineLanes({
      markers: [],
      scale,
      spans: [
        span('a', '2026-09-01T00:00:00Z', '2026-09-01T05:00:00Z'),
        span('b', '2026-09-01T01:00:00Z', '2026-09-01T05:00:00Z'),
      ],
    });

    expect(lanes[0]?.subRowCount).toBe(2);
  });

  it('orders lanes by their earliest activity', () => {
    const lanes = buildTimelineLanes({
      markers: [],
      scale,
      spans: [
        span('late', '2026-09-01T10:00:00Z', '2026-09-01T11:00:00Z'),
        span('early', '2026-09-01T01:00:00Z', '2026-09-01T02:00:00Z', {
          laneKey: 'plan:plan-2',
          laneLabel: 'Plan Two',
        }),
      ],
    });

    expect(lanes[0]?.key).toBe('plan:plan-2');
  });

  it('returns nothing when the window is empty', () => {
    expect(buildTimelineLanes({ markers: [], scale, spans: [] })).toEqual([]);
  });
});
