/**
 * @description Repository-target shapes shared by the schedule form, table, and detail views. The
 * option shape is the subset of a registered checkout the UI needs to label a target (name plus the
 * on-disk path as secondary text); the server owns resolving it to an actual cwd.
 */

export interface ScheduleRepositoryOption {
  displayName: string;
  filesystemPath: string;
  id: string;
}

/**
 * Sentinel for "no repository — use the workspace-root default". A Radix Select item cannot carry an
 * empty string value, so the form posts this and the action maps it back to null.
 */
export const SCHEDULE_REPOSITORY_NONE_VALUE = '__workspace_root__';
