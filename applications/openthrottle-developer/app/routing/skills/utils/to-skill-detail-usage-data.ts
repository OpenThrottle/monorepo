/**
 * @description Maps the deferred `skillUsage` detail query into the discriminated
 * `SkillDetailUsageData` prop the detail card consumes. Hoisted out of the
 * `/skills/$slug` route module per the route primitive shape (R3) so it is
 * discoverable and independently testable.
 */

import type { SkillDetailUsageData } from '~/routing/skills/data/skill-usage-detail';
import type { GetSkillDetailUsageQuery } from '~/__generated__/graphql';

/** Map the deferred usage query → the component's discriminated prop. */
export const toSkillDetailUsageData = (
  skillUsage: GetSkillDetailUsageQuery['skillUsage'],
): SkillDetailUsageData => {
  const row = skillUsage.bySkill[0];

  return {
    available: true,
    byDay: skillUsage.byDay.map((day) => ({
      date: day.date,
      oursCount: day.oursCount,
      thirdPartyCount: day.thirdPartyCount,
      totalCount: day.totalCount,
    })),
    skill: row
      ? {
          abandonedCount: row.abandonedCount,
          avgDurationMs: row.avgDurationMs ?? null,
          count: row.count,
          errorCount: row.errorCount,
          lastUsedAt: row.lastUsedAt == null ? null : String(row.lastUsedAt),
          outcomeCount: row.outcomeCount,
          scope: row.scope,
          skillName: row.skillName,
          successCount: row.successCount,
        }
      : null,
  };
};
