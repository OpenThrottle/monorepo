/**
 * @public
 * @description URL contract for the collapsible route stats row: the search
 * param that carries its open state, the value that means "open" (absent means
 * closed), and the DOM id shared by the toggle button's `aria-controls` and the
 * panel. One stats panel renders per route, so the id is a fixed string rather
 * than a `React.useId()` — the button and panel call the hook independently and
 * must agree on it.
 */
export const ROUTE_STATS_URL = {
  contentId: 'route-stats-panel',
  openValue: 'open',
  param: 'stats',
} as const;

export type RouteStatsUrlKey = keyof typeof ROUTE_STATS_URL;
export type RouteStatsUrlValue = (typeof ROUTE_STATS_URL)[RouteStatsUrlKey];
