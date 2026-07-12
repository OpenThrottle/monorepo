import { describe, expect, test } from 'vitest';
import type { RepoSkillEntry } from '~/routing/agents/data/repo-skills-registry';
import {
  mergeRepoSkillsWithSkillAvailability,
  type SkillAvailabilityRow,
} from '~/routing/skills/utils/merge-skill-availability';

const diskEntry = (
  slug: string,
  overrides: Partial<RepoSkillEntry> = {},
): RepoSkillEntry => ({
  disableModelInvocation: undefined,
  layout: 'agents',
  repoRelativePath: `.agents/skills/${slug}/SKILL.md`,
  slug,
  summary: `${slug} summary`,
  tags: undefined,
  ...overrides,
});

describe('mergeRepoSkillsWithSkillAvailability', () => {
  test('returns entries unchanged when availability is empty (silent fallback)', () => {
    const entries = [diskEntry('alpha'), diskEntry('beta')];

    const merged = mergeRepoSkillsWithSkillAvailability(entries, []);

    expect(merged).toBe(entries);
    expect(merged[0].effectiveDisableModelInvocation).toBeUndefined();
    expect(merged[0].provenance).toBeUndefined();
  });

  test('overlays effective flag and provenance from a matching row, keyed by slug', () => {
    const entries = [
      diskEntry('github-commit', { disableModelInvocation: true }),
    ];
    const rows: SkillAvailabilityRow[] = [
      {
        effectiveDisableModelInvocation: false,
        provenance: 'tag-allow:github@rule-1',
        slug: 'github-commit',
      },
    ];

    const [merged] = mergeRepoSkillsWithSkillAvailability(entries, rows);

    expect(merged.effectiveDisableModelInvocation).toBe(false);
    expect(merged.provenance).toBe('tag-allow:github@rule-1');
    // Static + disk-owned fields are preserved.
    expect(merged.disableModelInvocation).toBe(true);
    expect(merged.summary).toBe('github-commit summary');
  });

  test('leaves entries without a matching availability row untouched', () => {
    const untouched = diskEntry('only-on-disk', {
      disableModelInvocation: false,
    });
    const rows: SkillAvailabilityRow[] = [
      {
        effectiveDisableModelInvocation: true,
        provenance: 'posture:deny',
        slug: 'other',
      },
    ];

    const [merged] = mergeRepoSkillsWithSkillAvailability([untouched], rows);

    expect(merged).toBe(untouched);
  });

  test('disk remains the entry list — availability-only slugs are not added', () => {
    const entries = [diskEntry('alpha')];
    const rows: SkillAvailabilityRow[] = [
      {
        effectiveDisableModelInvocation: true,
        provenance: 'frontmatter:true',
        slug: 'alpha',
      },
      {
        effectiveDisableModelInvocation: true,
        provenance: 'frontmatter:true',
        slug: 'ghost',
      },
    ];

    const merged = mergeRepoSkillsWithSkillAvailability(entries, rows);

    expect(merged).toHaveLength(1);
    expect(merged[0].slug).toBe('alpha');
  });

  test('no-config invariant: frontmatter provenance keeps effective === static ?? false', () => {
    // Server returns the passthrough result (every provenance frontmatter:*).
    const entries = [
      diskEntry('unset-skill', { disableModelInvocation: undefined }),
      diskEntry('disabled-skill', { disableModelInvocation: true }),
      diskEntry('enabled-skill', { disableModelInvocation: false }),
    ];
    const rows: SkillAvailabilityRow[] = [
      {
        effectiveDisableModelInvocation: false,
        provenance: 'frontmatter:unset',
        slug: 'unset-skill',
      },
      {
        effectiveDisableModelInvocation: true,
        provenance: 'frontmatter:true',
        slug: 'disabled-skill',
      },
      {
        effectiveDisableModelInvocation: false,
        provenance: 'frontmatter:false',
        slug: 'enabled-skill',
      },
    ];

    const merged = mergeRepoSkillsWithSkillAvailability(entries, rows);

    for (const entry of merged) {
      expect(entry.effectiveDisableModelInvocation).toBe(
        entry.disableModelInvocation ?? false,
      );
    }
  });
});
