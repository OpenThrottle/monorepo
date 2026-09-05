/**
 * @description Window presets and default view state for /timeline. The presets
 * are the zoom control in v1 — free zoom is deferred — so they are also the only
 * window widths the loader will build.
 */

import { TimelineLaneGrouping } from '~/__generated__/graphql';

/**
 * Lane grouping modes. Re-exported from the generated enum rather than
 * re-declared, so a mode added server-side cannot silently go unhandled here.
 */
export { TimelineLaneGrouping as TimelineGrouping } from '~/__generated__/graphql';

/**
 * Preset keys. Keys are alphabetised for the lint rule; the display order that
 * actually matters — narrowest first — is {@link TIMELINE_WINDOW_PRESETS}.
 */
export const TIMELINE_WINDOW_PRESET = {
  '24h': '24h',
  '30d': '30d',
  '7d': '7d',
} as const;

export type TimelineWindowPreset =
  (typeof TIMELINE_WINDOW_PRESET)[keyof typeof TIMELINE_WINDOW_PRESET];

export const TIMELINE_WINDOW_PRESETS: readonly TimelineWindowPreset[] = [
  TIMELINE_WINDOW_PRESET['24h'],
  TIMELINE_WINDOW_PRESET['7d'],
  TIMELINE_WINDOW_PRESET['30d'],
];

export const DEFAULT_TIMELINE_WINDOW_PRESET: TimelineWindowPreset =
  TIMELINE_WINDOW_PRESET['7d'];

/** Hours each preset spans, used to build the loader's `from`. */
export const TIMELINE_WINDOW_HOURS: Record<TimelineWindowPreset, number> = {
  '24h': 24,
  '30d': 24 * 30,
  '7d': 24 * 7,
};

export const DEFAULT_TIMELINE_GROUPING = TimelineLaneGrouping.ByPlan;

/** Grouping modes in the order the control offers them; default first. */
export const TIMELINE_GROUPINGS: readonly TimelineLaneGrouping[] = [
  TimelineLaneGrouping.ByPlan,
  TimelineLaneGrouping.ByCheckout,
  TimelineLaneGrouping.ByBackend,
];

/** Search-param names, so the route and its controls cannot drift apart. */
export const TIMELINE_SEARCH_PARAM = {
  branch: 'branch',
  grouping: 'grouping',
  markerKinds: 'markers',
  spanKinds: 'spans',
  window: 'window',
} as const;
