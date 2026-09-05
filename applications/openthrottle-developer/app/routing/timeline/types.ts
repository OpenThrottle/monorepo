/**
 * @description Shared types for the timeline routing area. Row shapes come from
 * the generated GraphQL fragments so the chart cannot drift from the query, and
 * the layout types are the contract between `utils/` (which does the math) and
 * `components/` (which only draws).
 */

import type {
  TimelineMarkerRowFragment,
  TimelineSpanRowFragment,
} from '~/__generated__/graphql';
import type { TimelineMarkerKind, TimelineSpanKind } from './config/kinds';

/** A duration row exactly as the server returned it. */
export type TimelineSpan = TimelineSpanRowFragment;

/** An instant row exactly as the server returned it. */
export type TimelineMarker = TimelineMarkerRowFragment;

/** Per-kind row count and truncation flag. */
export type TimelineTruncation = {
  readonly kind: string;
  readonly returned: number;
  readonly truncated: boolean;
};

/** A span placed into a lane sub-row by the interval packer. */
export type PlacedTimelineSpan = {
  readonly span: TimelineSpan;
  /** Zero-based sub-row within the lane; grows only when spans overlap. */
  readonly subRow: number;
};

/** A marker, or a cluster of markers that collided at this zoom level. */
export type TimelineMarkerCluster = {
  /** Representative timestamp — the earliest in the cluster. */
  readonly at: string;
  readonly kind: TimelineMarkerKind;
  readonly markers: readonly TimelineMarker[];
};

/** One lane's fully-laid-out contents. */
export type TimelineLane = {
  readonly key: string;
  readonly label: string;
  readonly markerClusters: readonly TimelineMarkerCluster[];
  readonly spans: readonly PlacedTimelineSpan[];
  /** Sub-rows needed by the widest overlap in this lane; at least 1. */
  readonly subRowCount: number;
};

/** The kind filters currently applied, as the loader resolved them. */
export type TimelineKindSelection = {
  readonly markerKinds: readonly TimelineMarkerKind[] | null;
  readonly spanKinds: readonly TimelineSpanKind[] | null;
};
