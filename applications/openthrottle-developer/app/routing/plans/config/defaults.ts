export const DEFAULT_PLAN_DESCRIPTION_PREVIEW_LINES = 4;
export const DEFAULT_PLAN_SUMMARY_PREVIEW_LINES = 3;

export const DEFAULT_PLAN_TASKS_VIEW_STORAGE_KEY = `openthrottle-developer:planTasksView`;

export const RECENT_WORKSPACE_PATHS_STORAGE_KEY = `openthrottle-developer:recentWorkspacePaths`;
export const RECENT_WORKSPACE_PATHS_MAX = 10;

/**
 * @description How far ahead a plan run may be scheduled. The server is the real
 * gate (it owns the clock); the Run dialog mirrors it so the user learns before
 * submitting.
 */
export const PLAN_RUN_SCHEDULE_MAX_DAYS = 30;

/** @description How often the Run dialog refreshes its clock (schedule echo, past-time check) while open. */
export const PLAN_RUN_DIALOG_CLOCK_TICK_MS = 30_000;
