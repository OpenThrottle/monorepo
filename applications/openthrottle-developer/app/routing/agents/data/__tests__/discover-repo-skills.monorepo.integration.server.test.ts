// @vitest-environment node
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';
import { discoverRepoSkills } from '~/routing/agents/data/discover-repo-skills.server';
import {
  getRepoSkillsRegistryCounts,
  type RepoSkillEntry,
} from '~/routing/agents/data/repo-skills-registry';
import {
  findMonorepoRootFromPath,
  isMonorepoRootDirectory,
} from '~/routing/agents/data/resolve-monorepo-root.server';

const monorepoRootCandidate = join(import.meta.dirname, '../../../../../../..');

const countOnDiskSkillFolders = (root: string, skillsDir: string): number => {
  const absoluteDir = join(root, skillsDir);
  if (!existsSync(absoluteDir)) {
    return 0;
  }

  return readdirSync(absoluteDir, { withFileTypes: true }).filter(
    (dirent) =>
      dirent.isDirectory() &&
      existsSync(join(absoluteDir, dirent.name, 'SKILL.md')),
  ).length;
};

const REQUIRED_AGENT_SKILL_SLUGS = [
  'openthrottle-generators',
  'openthrottle-stack',
  'ot-plans',
  'workflow-ralph',
] as const;

describe('discoverRepoSkills monorepo integration', () => {
  const monorepoRoot = findMonorepoRootFromPath(monorepoRootCandidate);

  test.skipIf(!monorepoRoot || !isMonorepoRootDirectory(monorepoRoot))(
    'discovered layout counts match on-disk SKILL.md folders',
    () => {
      const entries = discoverRepoSkills(monorepoRoot);
      const counts = getRepoSkillsRegistryCounts(entries);

      expect(counts.agents).toBe(
        countOnDiskSkillFolders(monorepoRoot, '.agents/skills'),
      );
      expect(counts.cursor).toBe(
        countOnDiskSkillFolders(monorepoRoot, '.cursor/skills'),
      );
    },
  );

  test.skipIf(!monorepoRoot || !isMonorepoRootDirectory(monorepoRoot))(
    'includes repo skills that replaced the static registry list',
    () => {
      const entries = discoverRepoSkills(monorepoRoot);
      const slugs = new Set(entries.map((entry: RepoSkillEntry) => entry.slug));

      for (const slug of REQUIRED_AGENT_SKILL_SLUGS) {
        expect(slugs.has(slug)).toBe(true);
      }
    },
  );

  test.skipIf(!monorepoRoot || !isMonorepoRootDirectory(monorepoRoot))(
    'repoRelativePath values point at existing SKILL.md files',
    () => {
      const entries = discoverRepoSkills(monorepoRoot);

      for (const entry of entries) {
        expect(existsSync(join(monorepoRoot, entry.repoRelativePath))).toBe(
          true,
        );
      }
    },
  );
});
