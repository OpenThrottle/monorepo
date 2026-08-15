/**
 * @description Maps the deferred aggregate `skillUsage` query into the
 * discriminated `SkillsIndexUsageData` prop the /skills index usage sections
 * consume. Hoisted out of the route module per the route primitive shape (R3)
 * so it is discoverable and independently testable. Mirrors
 * `toSkillDetailUsageData` for the single-skill detail card.
 */

import type { SkillsIndexUsageData } from '~/routing/skills/data/skills-index-usage';
import type { GetUsageSkillUsageQuery } from '~/__generated__/graphql';

/** Map the deferred aggregate usage query → the sections' discriminated prop. */
export const toSkillsIndexUsageData = (
  skillUsage: GetUsageSkillUsageQuery['skillUsage'],
): SkillsIndexUsageData => {
  return {
    available: true,
    byDay: skillUsage.byDay.map((day) => ({
      date: day.date,
      oursCount: day.oursCount,
      thirdPartyCount: day.thirdPartyCount,
      totalCount: day.totalCount,
    })),
    bySkill: skillUsage.bySkill,
  };
};
