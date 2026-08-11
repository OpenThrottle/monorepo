import { describe, expect, it } from 'vitest';
import { toSkillDetailUsageData } from '../to-skill-detail-usage-data';
import type { GetSkillDetailUsageQuery } from '~/__generated__/graphql';

type SkillUsage = GetSkillDetailUsageQuery['skillUsage'];

const byDay: SkillUsage['byDay'] = [
  {
    date: '2026-08-01',
    oursCount: 2,
    thirdPartyCount: 1,
    totalCount: 3,
  },
];

const row: SkillUsage['bySkill'][number] = {
  abandonedCount: 1,
  avgDurationMs: 1200,
  count: 10,
  errorCount: 2,
  lastUsedAt: '2026-08-09T00:00:00.000Z',
  outcomeCount: 8,
  scope: 'user',
  skillName: 'graphify',
  successCount: 6,
};

describe('toSkillDetailUsageData', () => {
  it('maps the first bySkill row and the daily series into the available shape', () => {
    const result = toSkillDetailUsageData({ byDay, bySkill: [row] });

    expect(result).toEqual({
      available: true,
      byDay: [
        { date: '2026-08-01', oursCount: 2, thirdPartyCount: 1, totalCount: 3 },
      ],
      skill: {
        abandonedCount: 1,
        avgDurationMs: 1200,
        count: 10,
        errorCount: 2,
        lastUsedAt: '2026-08-09T00:00:00.000Z',
        outcomeCount: 8,
        scope: 'user',
        skillName: 'graphify',
        successCount: 6,
      },
    });
  });

  it('returns skill: null when no bySkill row is present (skill on disk, no usage)', () => {
    const result = toSkillDetailUsageData({ byDay: [], bySkill: [] });

    expect(result).toEqual({ available: true, byDay: [], skill: null });
  });

  it('coerces a null avgDurationMs to null and a numeric lastUsedAt to a string', () => {
    const result = toSkillDetailUsageData({
      byDay: [],
      bySkill: [{ ...row, avgDurationMs: null, lastUsedAt: 1723200000000 }],
    });

    expect(result).toMatchObject({
      available: true,
      skill: { avgDurationMs: null, lastUsedAt: '1723200000000' },
    });
  });
});
