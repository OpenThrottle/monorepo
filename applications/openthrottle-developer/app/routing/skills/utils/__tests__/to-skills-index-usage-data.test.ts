import { describe, expect, test } from 'vitest';
import { toSkillsIndexUsageData } from '../to-skills-index-usage-data';
import type { GetUsageSkillUsageQuery } from '~/__generated__/graphql';

const skillUsage = (
  overrides: Partial<GetUsageSkillUsageQuery['skillUsage']> = {},
): GetUsageSkillUsageQuery['skillUsage'] => ({
  byDay: [],
  byScope: [],
  bySkill: [],
  filterOptions: { cwds: [], gitBranches: [] },
  totalCount: 0,
  ...overrides,
});

describe('toSkillsIndexUsageData', () => {
  test('maps byDay to the chart datum shape and passes bySkill through', () => {
    const result = toSkillsIndexUsageData(
      skillUsage({
        byDay: [
          {
            date: '2026-08-05',
            oursCount: 3,
            thirdPartyCount: 1,
            totalCount: 4,
          },
        ],
        bySkill: [
          {
            abandonedCount: 0,
            avgDurationMs: null,
            count: 2,
            errorCount: 0,
            outcomeCount: 0,
            scope: 'ours',
            skillName: 'ot-plans',
            successCount: 0,
          },
        ],
        totalCount: 2,
      }),
    );

    expect(result.available).toBe(true);
    if (!result.available) throw new Error('expected available');
    expect(result.byDay).toEqual([
      { date: '2026-08-05', oursCount: 3, thirdPartyCount: 1, totalCount: 4 },
    ]);
    expect(result.bySkill).toHaveLength(1);
    expect(result.bySkill[0]?.skillName).toBe('ot-plans');
  });

  test('produces an available-but-empty result for no data', () => {
    const result = toSkillsIndexUsageData(skillUsage());

    expect(result.available).toBe(true);
    if (!result.available) throw new Error('expected available');
    expect(result.byDay).toEqual([]);
    expect(result.bySkill).toEqual([]);
  });
});
