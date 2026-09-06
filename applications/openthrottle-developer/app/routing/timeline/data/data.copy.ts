/**
 * @description Single-sourced user-facing copy for the timeline routing area. The
 * components render these and specs import the same constants, so a wording change
 * updates one place and no spec breaks on copy drift. Add new copy here rather than
 * inlining sentence-length literals in components.
 */

export const TIMELINE_NOT_FOUND_COPY = {
  description: `The timeline you're looking for doesn't exist or was removed.`,
  title: `timeline not found`,
} as const;

export const TIMELINE_PAGE_COPY = {
  betaBadge: `Beta`,
  subtitle: `Runs and sessions as spans, everything else as markers on the same time axis — so you can see what overlapped what.`,
  title: `Timeline`,
} as const;

export const TIMELINE_EMPTY_COPY = {
  description: `Queue a plan run, start a chat, or record a commit against a plan and it will appear here. Widen the window if you expect older activity.`,
  title: `Nothing in this window`,
} as const;

/** Human labels for the window presets. */
export const TIMELINE_WINDOW_LABELS = {
  '24h': `24 hours`,
  '30d': `30 days`,
  '7d': `7 days`,
} as const;

/** Human labels for the lane grouping modes. */
export const TIMELINE_GROUPING_LABELS = {
  BY_BACKEND: `By backend`,
  BY_CHECKOUT: `By checkout`,
  BY_PLAN: `By plan`,
} as const;

/**
 * Disclosures for the data gaps this view sits on. Rendering the view without
 * these would present derived numbers as measured ones.
 *
 * `grillingScope` is conditional, not permanent: skill events carry a real
 * `userId` since migration 110, but it is never backfilled, so a window can
 * hold a mix of attributed and unattributed rows. Show it only when the window
 * actually contains an unattributed one — see `hasUnattributedGrilling`.
 */
export const TIMELINE_DISCLOSURE_COPY = {
  derivedEnd: `Hatched ends are derived. Plan runs record no finish timestamp, so the bar runs to the last known activity — it can overstate execution time.`,
  grillingScope: `Some grilling events in this window predate user attribution, so they are placed by branch rather than by who ran it.`,
  statusChange: `Status transitions are only recorded when an agent writes a status_change artifact, which happens inconsistently. Expect gaps.`,
  taskUpdated: `Only the most recent write to a task is stored, so a task shows one update marker however many times it changed.`,
} as const;

/** Tooltip lines that explain a rendering treatment rather than the data. */
export const TIMELINE_SPAN_TOOLTIP_COPY = {
  clippedEnd: `Continues past the end of this window.`,
  clippedStart: `Started before this window.`,
  derivedEnd: `End derived from last known activity, not a recorded finish.`,
  widened: `Too short to draw to scale; widened so it stays clickable.`,
} as const;

export const TIMELINE_CONTROLS_COPY = {
  branchLabel: `Branch`,
  branchPlaceholder: `All branches`,
  groupingLabel: `Group lanes`,
  kindsLabel: `Show`,
  windowLabel: `Window`,
} as const;

export const TIMELINE_LEGEND_COPY = {
  derivedLabel: `Derived end`,
  markersHeading: `Markers`,
  spansHeading: `Spans`,
} as const;

export const TIMELINE_DETAIL_COPY = {
  backendLabel: `Backend`,
  closeLabel: `Close details`,
  durationLabel: `Duration`,
  endedLabel: `Ended`,
  modelLabel: `Model`,
  openPlan: `Open plan`,
  openPullRequest: `Open pull request`,
  startedLabel: `Started`,
  statusLabel: `Status`,
} as const;

export const TIMELINE_TRUNCATION_COPY = {
  /** Rendered when a kind hit its server-side row cap. */
  suffix: `(showing the most recent)`,
} as const;
