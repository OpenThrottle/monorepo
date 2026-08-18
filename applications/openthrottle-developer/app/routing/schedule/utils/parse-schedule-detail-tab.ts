/**
 * @description Search param + validating parser for the active tab on the
 * scheduled-job detail page (`/schedule/:jobId`). Mirrors
 * `parseSkillDetailTab` — returns `null` for unknown/missing values so the
 * caller falls back to the default (`prompt`), which `useUrlSyncedTabValue`
 * canonicalizes out of the URL.
 */

/** Valid tab keys for the scheduled-job detail page. */
export type ScheduleDetailTab = 'history' | 'prompt';

/** Search param for the active tab on schedule detail. Omitted when `prompt`. */
export const SCHEDULE_DETAIL_TAB_SEARCH_PARAM = 'tab';

const SCHEDULE_DETAIL_TAB_VALUES: readonly ScheduleDetailTab[] = [
  'history',
  'prompt',
];

const isScheduleDetailTab = (raw: string): raw is ScheduleDetailTab =>
  SCHEDULE_DETAIL_TAB_VALUES.some((tab) => tab === raw);

/** Parse the `tab` param for schedule detail; `null` for missing/unknown. */
export const parseScheduleDetailTab = (
  raw: string | null,
): ScheduleDetailTab | null => {
  if (raw === null || raw === '') {
    return null;
  }

  return isScheduleDetailTab(raw) ? raw : null;
};
