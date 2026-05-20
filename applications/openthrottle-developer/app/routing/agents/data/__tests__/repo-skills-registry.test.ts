import { describe, expect, test } from 'vitest';
import {
  getRepoSkillsRegistryCounts,
  type RepoSkillEntry,
} from '~/routing/agents/data/repo-skills-registry';

describe('getRepoSkillsRegistryCounts', () => {
  test('returns zeros for an empty list', () => {
    expect(getRepoSkillsRegistryCounts([])).toEqual({ agents: 0, cursor: 0 });
  });

  test('counts agents layout entries', () => {
    const entries: RepoSkillEntry[] = [
      {
        layout: 'agents',
        repoRelativePath: '.agents/skills/a/SKILL.md',
        slug: 'a',
        summary: 'A',
      },
      {
        layout: 'agents',
        repoRelativePath: '.agents/skills/b/SKILL.md',
        slug: 'b',
        summary: 'B',
      },
    ];
    expect(getRepoSkillsRegistryCounts(entries)).toEqual({
      agents: 2,
      cursor: 0,
    });
  });

  test('counts cursor layout entries', () => {
    const entries: RepoSkillEntry[] = [
      {
        layout: 'cursor',
        repoRelativePath: '.cursor/skills/x/SKILL.md',
        slug: 'x',
        summary: 'X',
      },
    ];
    expect(getRepoSkillsRegistryCounts(entries)).toEqual({
      agents: 0,
      cursor: 1,
    });
  });

  test('counts mixed layouts', () => {
    const entries: RepoSkillEntry[] = [
      {
        layout: 'agents',
        repoRelativePath: '.agents/skills/a/SKILL.md',
        slug: 'a',
        summary: 'A',
      },
      {
        layout: 'cursor',
        repoRelativePath: '.cursor/skills/a/SKILL.md',
        slug: 'a',
        summary: 'Cursor A',
      },
      {
        layout: 'agents',
        repoRelativePath: '.agents/skills/b/SKILL.md',
        slug: 'b',
        summary: 'B',
      },
    ];
    expect(getRepoSkillsRegistryCounts(entries)).toEqual({
      agents: 2,
      cursor: 1,
    });
  });
});
