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
  test('prefers agents layout when a slug appears in agents and a fan-out', () => {
    const entries: RepoSkillEntry[] = [
      {
        arguments: undefined,
        disableModelInvocation: undefined,
        layout: 'claude',
        repoRelativePath: '.claude/skills/shared/SKILL.md',
        slug: 'shared',
        source: 'external',
        summary: 'Claude fan-out copy',
        tags: undefined,
      },
      {
        arguments: undefined,
        disableModelInvocation: undefined,
        layout: 'agents',
        repoRelativePath: '.agents/skills/shared/SKILL.md',
        slug: 'shared',
        source: 'external',
        summary: 'Agents canonical',
        tags: undefined,
      },
    ];

    expect(dedupeRepoSkillEntriesBySlug(entries)).toEqual([
      {
        arguments: undefined,
        disableModelInvocation: undefined,
        layout: 'agents',
        repoRelativePath: '.agents/skills/shared/SKILL.md',
        slug: 'shared',
        source: 'external',
        summary: 'Agents canonical',
        tags: undefined,
      },
    ]);
  });

  test('keeps fan-out-only slugs', () => {
    const entries: RepoSkillEntry[] = [
      {
        arguments: undefined,
        disableModelInvocation: undefined,
        layout: 'claude',
        repoRelativePath: '.claude/skills/claude-only/SKILL.md',
        slug: 'claude-only',
        source: 'external',
        summary: 'Claude only',
        tags: undefined,
      },
    ];

    expect(dedupeRepoSkillEntriesBySlug(entries)).toEqual(entries);
  });
});

describe('getRepoSkillsRegistryCounts', () => {
  test('returns zero for an empty list', () => {
    expect(getRepoSkillsRegistryCounts([])).toEqual({ agents: 0 });
  });

  test('counts all discovered entries under .agents/skills', () => {
    const entries: RepoSkillEntry[] = [
      {
        arguments: undefined,
        disableModelInvocation: undefined,
        layout: 'agents',
        repoRelativePath: '.agents/skills/a/SKILL.md',
        slug: 'a',
        source: 'external',
        summary: 'A',
        tags: undefined,
      },
      {
        arguments: undefined,
        disableModelInvocation: undefined,
        layout: 'agents',
        repoRelativePath: '.agents/skills/b/SKILL.md',
        slug: 'b',
        source: 'external',
        summary: 'B',
        tags: undefined,
      },
    ];
    expect(getRepoSkillsRegistryCounts(entries)).toEqual({ agents: 2 });
  });
});
