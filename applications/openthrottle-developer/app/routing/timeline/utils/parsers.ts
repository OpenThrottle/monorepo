/**
 * @description Parsing of /timeline URL search params into the loader's window
 * and filters. Pure and total: an unknown or malformed param falls back to the
 * default rather than throwing, so a hand-edited URL cannot 500 the route.
 */

import { TimelineLaneGrouping } from '~/__generated__/graphql';
import {
  DEFAULT_TIMELINE_GROUPING,
  DEFAULT_TIMELINE_WINDOW_PRESET,
  TIMELINE_SEARCH_PARAM,
  TIMELINE_WINDOW_HOURS,
  TIMELINE_WINDOW_PRESETS,
} from '../config/defaults';
import type { TimelineWindowPreset } from '../config/defaults';

const MS_PER_HOUR = 60 * 60 * 1000;

export type TimelineWindow = {
  readonly fromIso: string;
  readonly preset: TimelineWindowPreset;
  readonly toIso: string;
};

const isWindowPreset = (value: string): value is TimelineWindowPreset =>
  TIMELINE_WINDOW_PRESETS.some((preset) => preset === value);

const isGrouping = (value: string): value is TimelineLaneGrouping =>
  Object.values(TimelineLaneGrouping).some((grouping) => grouping === value);

/** The window preset named in the URL, or the default. */
export function parseTimelineWindowPreset(
  params: URLSearchParams,
): TimelineWindowPreset {
  const raw = params.get(TIMELINE_SEARCH_PARAM.window);
  if (raw != null && isWindowPreset(raw)) return raw;

  return DEFAULT_TIMELINE_WINDOW_PRESET;
}

/**
 * Resolve the concrete window. `now` is injected rather than read so the loader
 * and its tests agree on what "now" is.
 */
export function resolveTimelineWindow(
  params: URLSearchParams,
  now: Date,
): TimelineWindow {
  const preset = parseTimelineWindowPreset(params);
  const to = now.getTime();
  const from = to - TIMELINE_WINDOW_HOURS[preset] * MS_PER_HOUR;

  return {
    fromIso: new Date(from).toISOString(),
    preset,
    toIso: new Date(to).toISOString(),
  };
}

/** The lane grouping named in the URL, or the default. */
export function parseTimelineGrouping(
  params: URLSearchParams,
): TimelineLaneGrouping {
  const raw = params.get(TIMELINE_SEARCH_PARAM.grouping);
  if (raw != null && isGrouping(raw)) return raw;

  return DEFAULT_TIMELINE_GROUPING;
}

/**
 * A comma-separated kind allowlist. An absent param means "every kind" and
 * resolves to null, which the server reads as no filter; an explicitly empty
 * param means "none" and stays an empty list, so unchecking every box really
 * does query nothing.
 */
export function parseTimelineKinds<TKind extends string>(
  params: URLSearchParams,
  key: string,
  allowed: readonly TKind[],
): TKind[] | null {
  const raw = params.get(key);
  if (raw == null) return null;

  const isAllowed = (entry: string): entry is TKind =>
    allowed.some((kind) => kind === entry);

  return raw
    .split(',')
    .map((entry) => entry.trim())
    .filter(isAllowed);
}

/** The branch filter, normalised so an empty param reads as absent. */
export function parseTimelineBranch(params: URLSearchParams): string | null {
  const raw = params.get(TIMELINE_SEARCH_PARAM.branch);

  return raw != null && raw !== '' ? raw : null;
}
