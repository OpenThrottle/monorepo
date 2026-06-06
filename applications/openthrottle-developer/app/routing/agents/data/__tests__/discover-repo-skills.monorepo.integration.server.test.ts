// @vitest-environment node
import { existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';
import { discoverRepoSkills } from '~/routing/agents/data/discover-repo-skills.server';
import {
  getRepoSkillsRegistryCounts,
  REQUIRED_AGENTS_SKILL_SLUGS,
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

  return readdirSync(absoluteDir, { withFileTypes: true }).filter((dirent) => {
    const isFolder =
      dirent.isDirectory() ||
      (dirent.isSymbolicLink() &&
        statSync(join(absoluteDir, dirent.name)).isDirectory());
    return isFolder && existsSync(join(absoluteDir, dirent.name, 'SKILL.md'));
  }).length;
};

describe('discoverRepoSkills monorepo integration', () => {
  const monorepoRoot = findMonorepoRootFromPath(monorepoRootCandidate);

  test.skipIf(!monorepoRoot || !isMonorepoRootDirectory(monorepoRoot))(
    'dedupes symlinked cursor skills and reports unique slugs per layout',
    () => {
      const entries = discoverRepoSkills(monorepoRoot);
      const counts = getRepoSkillsRegistryCounts(entries);
      const slugs = new Set(entries.map((entry: RepoSkillEntry) => entry.slug));

      expect(slugs.size).toBe(entries.length);
      expect(counts.agents).toBe(
        countOnDiskSkillFolders(monorepoRoot, '.agents/skills'),
      );
      expect(counts.agents + counts.cursor).toBe(entries.length);
    },
  );

  test.skipIf(!monorepoRoot || !isMonorepoRootDirectory(monorepoRoot))(
    'includes repo skills that replaced the static registry list',
    () => {
      const entries = discoverRepoSkills(monorepoRoot);
      const slugs = new Set(entries.map((entry: RepoSkillEntry) => entry.slug));

      for (const slug of REQUIRED_AGENTS_SKILL_SLUGS) {
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
