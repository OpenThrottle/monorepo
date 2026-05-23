import { describe, expect, test } from 'vitest';
import { OPENTHROTTLE_REPO_SKILL_PATHS } from './openthrottle-repo-skill-paths';

const REQUIRED_AGENTS_SKILL_SLUGS = [
  'openthrottle-generators',
  'openthrottle-stack',
  'ot-plans',
  'workflow-ralph',
] as const;

describe('OPENTHROTTLE_REPO_SKILL_PATHS', () => {
  test('lists OpenThrottle agent skills aligned with .agents/skills', () => {
    const agentSlugs = new Set(
      OPENTHROTTLE_REPO_SKILL_PATHS.filter(
        (entry) => entry.layout === 'agents',
      ).map((entry) => entry.slug),
    );

    for (const slug of REQUIRED_AGENTS_SKILL_SLUGS) {
      expect(agentSlugs.has(slug)).toBe(true);
    }
  });

  test('uses repo-relative SKILL.md paths for agent entries', () => {
    for (const entry of OPENTHROTTLE_REPO_SKILL_PATHS) {
      expect(entry.repoRelativePath).toMatch(/\/SKILL\.md$/);
      if (entry.layout === 'agents') {
        expect(entry.repoRelativePath.startsWith('.agents/skills/')).toBe(true);
      } else {
        expect(entry.repoRelativePath.startsWith('.cursor/skills/')).toBe(true);
      }
    }
  });
});
