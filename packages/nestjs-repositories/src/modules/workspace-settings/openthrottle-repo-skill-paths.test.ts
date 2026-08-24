import { describe, expect, test } from 'vitest';
import { OPENTHROTTLE_REPO_SKILL_PATHS } from './openthrottle-repo-skill-paths';

const REQUIRED_AGENTS_SKILL_SLUGS = [
  'ot-generators',
  'ot-plans',
  'ot-stack',
  'workflow-ralph',
] as const;

describe('OPENTHROTTLE_REPO_SKILL_PATHS', () => {
  test('lists OpenThrottle agent skills aligned with .agents/skills', () => {
    const slugs = new Set(
      OPENTHROTTLE_REPO_SKILL_PATHS.map((entry) => entry.slug),
    );

    for (const slug of REQUIRED_AGENTS_SKILL_SLUGS) {
      expect(slugs.has(slug)).toBe(true);
    }
  });

  test('uses repo-relative .agents/skills SKILL.md paths', () => {
    for (const entry of OPENTHROTTLE_REPO_SKILL_PATHS) {
      expect(entry.repoRelativePath).toMatch(/\/SKILL\.md$/);
      expect(entry.repoRelativePath.startsWith('.agents/skills/')).toBe(true);
    }
  });
});
