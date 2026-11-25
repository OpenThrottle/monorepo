/**
 * @description Single-sourced user-facing copy for the queues overview area.
 * Components render these and specs import the same constants so wording
 * changes update one place.
 */

/**
 * @description Job-state filter on the queue detail toolbar.
 */
export const QUEUE_STATE_FILTER_COPY = {
  allStates: `All states`,
  title: `State`,
} as const;

/**
 * @description Per-row actions menu on the queues overview table.
 */
export const QUEUES_ROW_ACTIONS_COPY = {
  heading: `Queue controls`,
  menuAriaLabelPrefix: `Queue controls for`,
  pauseQueue: `Pause queue`,
  resumeQueue: `Resume queue`,
  view: `View`,
} as const;
