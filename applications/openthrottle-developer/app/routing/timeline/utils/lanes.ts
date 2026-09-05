/**
 * @description Lane assembly: group rows by their server-assigned lane key,
 * pack overlapping spans into sub-rows, and bucket colliding markers.
 *
 * Pure and DOM-free, like the scale module — this is the heart of the view and
 * jsdom would let none of it be verified through rendering.
 */

import { TIMELINE_MARKER_COLLISION_PX } from '../config/layout';
import type { TimelineScale } from './scale';
import type {
  PlacedTimelineSpan,
  TimelineLane,
  TimelineMarker,
  TimelineMarkerCluster,
  TimelineSpan,
} from '../types';

const toMillis = (value: Date | number | string): number =>
  value instanceof Date ? value.getTime() : new Date(value).getTime();

/**
 * Greedy interval packing: each span takes the lowest sub-row whose last span
 * has already ended. Spans must be sorted by start time for this to be correct,
 * which is why it sorts rather than trusting the caller.
 *
 * Overlap is the whole point of the view, so this never merges or drops a span
 * — the sub-row count simply grows to fit the deepest overlap.
 */
export function packSpansIntoSubRows(
  spans: readonly TimelineSpan[],
): PlacedTimelineSpan[] {
  const ordered = [...spans].sort(
    (a, b) => toMillis(a.startsAt) - toMillis(b.startsAt),
  );

  /** Last occupied end time per sub-row. */
  const subRowEnds: number[] = [];
  const placed: PlacedTimelineSpan[] = [];

  for (const span of ordered) {
    const startsAt = toMillis(span.startsAt);
    // A zero-length or inverted span still occupies its start instant; treating
    // its end as its start keeps it from blocking the sub-row indefinitely.
    const endsAt = Math.max(startsAt, toMillis(span.endsAt));

    let subRow = subRowEnds.findIndex((end) => end <= startsAt);
    if (subRow === -1) {
      subRow = subRowEnds.length;
      subRowEnds.push(endsAt);
    } else {
      subRowEnds[subRow] = endsAt;
    }

    placed.push({ span, subRow });
  }

  return placed;
}

/**
 * Bucket markers that land within {@link TIMELINE_MARKER_COLLISION_PX} of each
 * other into one cluster glyph. Clustering is per kind, so a commit and a task
 * at the same instant stay two distinguishable shapes rather than merging into
 * an ambiguous blob.
 *
 * At a 30-day window this is what keeps the chart from emitting thousands of
 * nodes for a busy month.
 */
export function clusterMarkers(
  markers: readonly TimelineMarker[],
  scale: TimelineScale,
): TimelineMarkerCluster[] {
  const byKind = new Map<string, TimelineMarker[]>();

  for (const marker of markers) {
    const bucket = byKind.get(marker.kind);
    if (bucket === undefined) {
      byKind.set(marker.kind, [marker]);
      continue;
    }
    bucket.push(marker);
  }

  const clusters: TimelineMarkerCluster[] = [];

  for (const [, kindMarkers] of byKind) {
    const ordered = [...kindMarkers].sort(
      (a, b) => toMillis(a.at) - toMillis(b.at),
    );

    let current: TimelineMarker[] = [];
    let anchorX = 0;

    for (const marker of ordered) {
      const x = scale.x(marker.at);

      if (current.length === 0) {
        current = [marker];
        anchorX = x;
        continue;
      }

      if (Math.abs(x - anchorX) <= TIMELINE_MARKER_COLLISION_PX) {
        current.push(marker);
        continue;
      }

      clusters.push(toCluster(current));
      current = [marker];
      anchorX = x;
    }

    if (current.length > 0) clusters.push(toCluster(current));
  }

  return clusters.sort((a, b) => toMillis(a.at) - toMillis(b.at));
}

const toCluster = (markers: TimelineMarker[]): TimelineMarkerCluster => {
  const first = markers[0];

  return {
    at: first?.at ?? '',
    kind: first?.kind ?? 'TASK_ADDED',
    markers,
  };
};

/**
 * Assemble lanes from the flat span/marker lists the loader returned.
 *
 * Lane keys and labels come from the server (which knows the active grouping),
 * so this never re-derives them — it only groups, packs and orders. Lanes are
 * ordered by their earliest activity, so the chart reads chronologically down
 * the page rather than in whatever order Postgres happened to return.
 */
export function buildTimelineLanes(args: {
  readonly markers: readonly TimelineMarker[];
  readonly scale: TimelineScale;
  readonly spans: readonly TimelineSpan[];
}): TimelineLane[] {
  const { markers, scale, spans } = args;

  const laneSpans = new Map<string, TimelineSpan[]>();
  const laneMarkers = new Map<string, TimelineMarker[]>();
  const laneLabels = new Map<string, string>();

  for (const span of spans) {
    laneLabels.set(span.laneKey, span.laneLabel);
    const bucket = laneSpans.get(span.laneKey);
    if (bucket === undefined) laneSpans.set(span.laneKey, [span]);
    else bucket.push(span);
  }

  for (const marker of markers) {
    // A lane that only ever holds markers (the skills lane, most obviously)
    // must still exist, so labels are registered from both sides.
    laneLabels.set(marker.laneKey, marker.laneLabel);
    const bucket = laneMarkers.get(marker.laneKey);
    if (bucket === undefined) laneMarkers.set(marker.laneKey, [marker]);
    else bucket.push(marker);
  }

  const lanes: TimelineLane[] = [];

  for (const [key, label] of laneLabels) {
    const placed = packSpansIntoSubRows(laneSpans.get(key) ?? []);
    const subRowCount = placed.reduce(
      (max, entry) => Math.max(max, entry.subRow + 1),
      1,
    );

    lanes.push({
      key,
      label,
      markerClusters: clusterMarkers(laneMarkers.get(key) ?? [], scale),
      spans: placed,
      subRowCount,
    });
  }

  return lanes.sort((a, b) => laneStart(a) - laneStart(b));
}

/** Earliest activity in a lane, used only for lane ordering. */
const laneStart = (lane: TimelineLane): number => {
  const spanStarts = lane.spans.map((entry) => toMillis(entry.span.startsAt));
  const markerStarts = lane.markerClusters.map((cluster) =>
    toMillis(cluster.at),
  );
  const all = [...spanStarts, ...markerStarts];

  return all.length > 0 ? Math.min(...all) : Number.MAX_SAFE_INTEGER;
};
