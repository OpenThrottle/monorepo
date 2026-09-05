/**
 * @description The span and marker kinds the client knows about, plus the glyph
 * and tone each renders with. The chart and the legend both read this table, so
 * a glyph cannot appear in one and not the other.
 *
 * Values come from the generated GraphQL enums rather than a hand-kept copy —
 * a kind added server-side then fails to compile here until it is given a glyph,
 * which is the failure you want.
 *
 * Shape encodes kind alongside colour deliberately: colour alone fails for
 * colour-blind viewers and is unreadable in a dense marker cluster.
 */

import { TimelineMarkerKind, TimelineSpanKind } from '~/__generated__/graphql';

export { TimelineMarkerKind, TimelineSpanKind };

export const TIMELINE_SPAN_KINDS: readonly TimelineSpanKind[] = [
  TimelineSpanKind.PlanRun,
  TimelineSpanKind.ScheduledRun,
  TimelineSpanKind.WorkSession,
];

export const TIMELINE_MARKER_KINDS: readonly TimelineMarkerKind[] = [
  TimelineMarkerKind.TaskAdded,
  TimelineMarkerKind.TaskUpdated,
  TimelineMarkerKind.Grilling,
  TimelineMarkerKind.GitCommit,
  TimelineMarkerKind.PullRequest,
  TimelineMarkerKind.StatusChange,
];

/** Marker glyphs. Distinct shapes, not just distinct fills. */
export const TIMELINE_MARKER_GLYPH = {
  [TimelineMarkerKind.GitCommit]: 'circle',
  [TimelineMarkerKind.Grilling]: 'star',
  [TimelineMarkerKind.PullRequest]: 'chevron',
  [TimelineMarkerKind.StatusChange]: 'bar',
  [TimelineMarkerKind.TaskAdded]: 'triangle',
  [TimelineMarkerKind.TaskUpdated]: 'diamond',
} as const satisfies Record<TimelineMarkerKind, string>;

export type TimelineMarkerGlyph =
  (typeof TIMELINE_MARKER_GLYPH)[TimelineMarkerKind];

/**
 * Tailwind fill classes per kind. Kept as full class strings rather than
 * interpolated fragments so Tailwind's scanner can see them.
 */
export const TIMELINE_MARKER_FILL_CLASS: Record<TimelineMarkerKind, string> = {
  [TimelineMarkerKind.GitCommit]: 'fill-emerald-500',
  [TimelineMarkerKind.Grilling]: 'fill-amber-500',
  [TimelineMarkerKind.PullRequest]: 'fill-violet-500',
  [TimelineMarkerKind.StatusChange]: 'fill-slate-400',
  [TimelineMarkerKind.TaskAdded]: 'fill-sky-500',
  [TimelineMarkerKind.TaskUpdated]: 'fill-sky-300',
};

export const TIMELINE_SPAN_FILL_CLASS: Record<TimelineSpanKind, string> = {
  [TimelineSpanKind.PlanRun]: 'fill-sky-500/70',
  [TimelineSpanKind.ScheduledRun]: 'fill-teal-500/70',
  [TimelineSpanKind.WorkSession]: 'fill-violet-500/70',
};

/** Labels shown in the legend, the kind toggles and the tooltips. */
export const TIMELINE_SPAN_KIND_LABEL: Record<TimelineSpanKind, string> = {
  [TimelineSpanKind.PlanRun]: 'Plan run',
  [TimelineSpanKind.ScheduledRun]: 'Scheduled run',
  [TimelineSpanKind.WorkSession]: 'Work session',
};

export const TIMELINE_MARKER_KIND_LABEL: Record<TimelineMarkerKind, string> = {
  [TimelineMarkerKind.GitCommit]: 'Commit',
  [TimelineMarkerKind.Grilling]: 'Grilling',
  [TimelineMarkerKind.PullRequest]: 'Pull request',
  [TimelineMarkerKind.StatusChange]: 'Status change',
  [TimelineMarkerKind.TaskAdded]: 'Task added',
  [TimelineMarkerKind.TaskUpdated]: 'Task updated',
};
