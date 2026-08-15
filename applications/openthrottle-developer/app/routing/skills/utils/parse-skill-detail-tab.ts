/**
 * @description Search param + validating parser for the active tab on the skill
 * detail page (`/skills/:slug`). Mirrors `parsePlanDetailTab` — returns `null`
 * for unknown/missing values so the caller falls back to the default (`skill`),
 * which `useUrlSyncedTabValue` canonicalizes out of the URL.
 */

/** Valid tab keys for the skill detail page. */
export type SkillDetailTab = 'skill' | 'usage';

/** Search param for the active tab on skill detail. Omitted when `skill`. */
export const SKILLS_DETAIL_TAB_SEARCH_PARAM = 'tab';

const SKILL_DETAIL_TAB_VALUES: readonly SkillDetailTab[] = ['skill', 'usage'];

const isSkillDetailTab = (raw: string): raw is SkillDetailTab =>
  SKILL_DETAIL_TAB_VALUES.some((tab) => tab === raw);

/** Parse the `tab` param for skill detail; `null` for missing/unknown. */
export const parseSkillDetailTab = (
  raw: string | null,
): SkillDetailTab | null => {
  if (raw === null || raw === '') {
    return null;
  }

  return isSkillDetailTab(raw) ? raw : null;
};
