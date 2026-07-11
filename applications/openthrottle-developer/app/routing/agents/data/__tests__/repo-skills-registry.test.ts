import { describe, expect, test } from 'vitest';
import {
  dedupeRepoSkillEntriesBySlug,
  getRepoSkillsRegistryCounts,
  REQUIRED_AGENTS_SKILL_SLUGS,
  type RepoSkillEntry,
} from '~/routing/agents/data/repo-skills-registry';

describe('REQUIRED_AGENTS_SKILL_SLUGS', () => {
  test('lists OpenThrottle-specific agent skills', () => {
    expect([...REQUIRED_AGENTS_SKILL_SLUGS]).toEqual([
      'openthrottle-generators',
      'openthrottle-stack',
      'ot-plans',
      'workflow-ralph',
    ]);
  });
});

describe('dedupeRepoSkillEntriesBySlug', () => {
  test('prefers agents layout when slug appears in agents and cursor', () => {
    const entries: RepoSkillEntry[] = [
      {
        disableModelInvocation: undefined,
        layout: 'cursor',
        repoRelativePath: '.cursor/skills/shared/SKILL.md',
        slug: 'shared',
        summary: 'Cursor copy',
        tags: undefined,
      },
      {
        disableModelInvocation: undefined,
        layout: 'agents',
        repoRelativePath: '.agents/skills/shared/SKILL.md',
        slug: 'shared',
        summary: 'Agents canonical',
        tags: undefined,
      },
    ];

    expect(dedupeRepoSkillEntriesBySlug(entries)).toEqual([
      {
        disableModelInvocation: undefined,
        layout: 'agents',
        repoRelativePath: '.agents/skills/shared/SKILL.md',
        slug: 'shared',
        summary: 'Agents canonical',
        tags: undefined,
      },
    ]);
  });

  test('keeps cursor-only slugs', () => {
    const entries: RepoSkillEntry[] = [
      {
        disableModelInvocation: undefined,
        layout: 'cursor',
        repoRelativePath: '.cursor/skills/cursor-only/SKILL.md',
        slug: 'cursor-only',
        summary: 'Cursor only',
        tags: undefined,
      },
    ];

    expect(dedupeRepoSkillEntriesBySlug(entries)).toEqual(entries);
  });
});

describe('getRepoSkillsRegistryCounts', () => {
  test('returns zeros for an empty list', () => {
    expect(getRepoSkillsRegistryCounts([])).toEqual({ agents: 0, cursor: 0 });
  });

  test('counts agents layout entries', () => {
    const entries: RepoSkillEntry[] = [
      {
        disableModelInvocation: undefined,
        layout: 'agents',
        repoRelativePath: '.agents/skills/a/SKILL.md',
        slug: 'a',
        summary: 'A',
        tags: undefined,
      },
      {
        disableModelInvocation: undefined,
        layout: 'agents',
        repoRelativePath: '.agents/skills/b/SKILL.md',
        slug: 'b',
        summary: 'B',
        tags: undefined,
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
        disableModelInvocation: undefined,
        layout: 'cursor',
        repoRelativePath: '.cursor/skills/x/SKILL.md',
        slug: 'x',
        summary: 'X',
        tags: undefined,
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
        disableModelInvocation: undefined,
        layout: 'agents',
        repoRelativePath: '.agents/skills/a/SKILL.md',
        slug: 'a',
        summary: 'A',
        tags: undefined,
      },
      {
        disableModelInvocation: undefined,
        layout: 'cursor',
        repoRelativePath: '.cursor/skills/a/SKILL.md',
        slug: 'a',
        summary: 'Cursor A',
        tags: undefined,
      },
      {
        disableModelInvocation: undefined,
        layout: 'agents',
        repoRelativePath: '.agents/skills/b/SKILL.md',
        slug: 'b',
        summary: 'B',
        tags: undefined,
      },
    ];
    expect(getRepoSkillsRegistryCounts(entries)).toEqual({
      agents: 2,
      cursor: 1,
    });
  });
});
