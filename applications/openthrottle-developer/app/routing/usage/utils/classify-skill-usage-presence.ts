import type { SkillPresence } from '~/routing/usage/data/data.skill-presence';
import { SKILL_PRESENCE } from '~/routing/usage/data/data.skill-presence';
import { SKILL_USAGE_SCOPES } from '~/routing/usage/data/data.skill-usage-copy';

/**
 * Classify one leaderboard row. A `third-party` row is `external` regardless of
 * whether its name coincidentally matches a disk slug — scope wins, because the
 * scan never covered it in the first place. Everything else must still be on
 * disk to count as present; scope then says whether it is shared or personal. An `injected` row is an
 * OpenThrottle skill authored elsewhere and linked into this checkout's skill
 * directories, so the disk scan finds it like any installed skill: present on
 * disk it is `installed` (linkable, no badge), gone it is `missing`.
 */
export const classifySkillUsagePresence = (
  row: { readonly scope: string; readonly skillName: string },
  presentSlugs: ReadonlySet<string>,
): SkillPresence => {
  if (row.scope === SKILL_USAGE_SCOPES.THIRD_PARTY) {
    return SKILL_PRESENCE.EXTERNAL;
  }

  if (!presentSlugs.has(row.skillName)) {
    return SKILL_PRESENCE.MISSING;
  }

  return row.scope === SKILL_USAGE_SCOPES.PERSONAL
    ? SKILL_PRESENCE.PERSONAL
    : SKILL_PRESENCE.INSTALLED;
};
