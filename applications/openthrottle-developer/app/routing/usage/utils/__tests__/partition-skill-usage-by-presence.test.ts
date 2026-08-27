import { describe, expect, test } from 'vitest';
import { partitionSkillUsageByPresence } from '../partition-skill-usage-by-presence';
import { SKILL_PRESENCE } from '~/routing/usage/data/skill-presence';
import { SKILL_USAGE_SCOPES } from '~/routing/usage/data/skill-usage-copy';
import type { UsageSkillUsageBySkillFragment } from '~/__generated__/graphql';

const row = (
  skillName: string,
  scope: string,
  count: number,
): UsageSkillUsageBySkillFragment => ({
  __typename: 'SkillUsageBySkillObject',
  abandonedCount: 0,
  avgDurationMs: null,
  count,
  errorCount: 0,
  outcomeCount: 0,
  scope,
  skillName,
  successCount: 0,
});

describe('partitionSkillUsageByPresence', () => {
  test('splits installed, external, and missing rows into the right buckets', () => {
    const bySkill = [
      row('ot-plans', SKILL_USAGE_SCOPES.OURS, 50),
      row('renamed-away', SKILL_USAGE_SCOPES.OURS, 40),
      row('vercel:deploy', SKILL_USAGE_SCOPES.THIRD_PARTY, 30),
      row('ot-stack', SKILL_USAGE_SCOPES.OURS, 20),
    ];

    const { active, missing } = partitionSkillUsageByPresence(
      bySkill,
      new Set(['ot-plans', 'ot-stack']),
    );

    expect(active.map((entry) => entry.skillName)).toEqual([
      'ot-plans',
      'vercel:deploy',
      'ot-stack',
    ]);
    expect(missing.map((entry) => entry.skillName)).toEqual(['renamed-away']);
  });

  test('keeps external rows in active, since they are out of scan scope rather than missing', () => {
    const { active, missing } = partitionSkillUsageByPresence(
      [row('vercel:deploy', SKILL_USAGE_SCOPES.THIRD_PARTY, 10)],
      new Set(),
    );

    expect(missing).toEqual([]);
    expect(active).toHaveLength(1);
    expect(active[0]?.presence).toBe(SKILL_PRESENCE.EXTERNAL);
  });

  test('resolves presence onto every returned row so components never re-derive it', () => {
    const { active, missing } = partitionSkillUsageByPresence(
      [
        row('ot-plans', SKILL_USAGE_SCOPES.OURS, 2),
        row('gone', SKILL_USAGE_SCOPES.OURS, 1),
      ],
      new Set(['ot-plans']),
    );

    expect(active[0]?.presence).toBe(SKILL_PRESENCE.INSTALLED);
    expect(missing[0]?.presence).toBe(SKILL_PRESENCE.MISSING);
  });

  test('preserves the server ranking within each bucket rather than re-sorting', () => {
    const bySkill = [
      row('gone-b', SKILL_USAGE_SCOPES.OURS, 90),
      row('gone-a', SKILL_USAGE_SCOPES.OURS, 80),
      row('gone-c', SKILL_USAGE_SCOPES.OURS, 70),
    ];

    const { missing } = partitionSkillUsageByPresence(bySkill, new Set());

    expect(missing.map((entry) => entry.skillName)).toEqual([
      'gone-b',
      'gone-a',
      'gone-c',
    ]);
  });

  test('returns two empty buckets for empty input', () => {
    expect(partitionSkillUsageByPresence([], new Set())).toEqual({
      active: [],
      missing: [],
    });
  });

  test('leaves active empty when every row is missing, and lets the caller decide what to render', () => {
    const { active, missing } = partitionSkillUsageByPresence(
      [
        row('gone-a', SKILL_USAGE_SCOPES.OURS, 5),
        row('gone-b', SKILL_USAGE_SCOPES.OURS, 3),
      ],
      new Set(['unrelated']),
    );

    expect(active).toEqual([]);
    expect(missing).toHaveLength(2);
  });

  test('does not mutate the input rows', () => {
    const original = row('ot-plans', SKILL_USAGE_SCOPES.OURS, 1);

    partitionSkillUsageByPresence([original], new Set(['ot-plans']));

    expect(original).not.toHaveProperty('presence');
  });
});
