import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { parseSkillFrontmatter } from '~/routing/agents/data/parse-skill-frontmatter.server';
import type {
  RepoSkillEntry,
  SkillRegistryLayout,
} from '~/routing/agents/data/repo-skills-registry';

const SKILL_FILE_NAME = 'SKILL.md';

const MISSING_SUMMARY_PLACEHOLDER = 'No description in SKILL.md frontmatter.';

const LAYOUT_SCAN_TARGETS: ReadonlyArray<{
  readonly layout: SkillRegistryLayout;
  readonly skillsDir: string;
}> = [
  { layout: 'agents', skillsDir: '.agents/skills' },
  { layout: 'cursor', skillsDir: '.cursor/skills' },
] as const;

const LAYOUT_SORT_ORDER: Readonly<Record<SkillRegistryLayout, number>> = {
  agents: 0,
  cursor: 1,
};

const sortRepoSkillEntries = (
  entries: RepoSkillEntry[],
): readonly RepoSkillEntry[] =>
  [...entries].sort((left, right) => {
    const byLayout =
      LAYOUT_SORT_ORDER[left.layout] - LAYOUT_SORT_ORDER[right.layout];
    if (byLayout !== 0) {
      return byLayout;
    }
    return left.slug.localeCompare(right.slug);
  });

const toRepoRelativePath = (skillsDir: string, folderName: string): string =>
  `${skillsDir}/${folderName}/${SKILL_FILE_NAME}`;

const readSkillEntry = (
  layout: SkillRegistryLayout,
  skillsDir: string,
  folderName: string,
  skillFilePath: string,
): RepoSkillEntry => {
  const repoRelativePath = toRepoRelativePath(skillsDir, folderName);
  let fileContent = '';

  try {
    fileContent = readFileSync(skillFilePath, 'utf8');
  } catch {
    return {
      layout,
      repoRelativePath,
      slug: folderName,
      summary: MISSING_SUMMARY_PLACEHOLDER,
    };
  }

  const { name, description } = parseSkillFrontmatter(fileContent);
  const slug = name && name.trim().length > 0 ? name.trim() : folderName;
  const summary =
    description && description.trim().length > 0
      ? description.trim()
      : MISSING_SUMMARY_PLACEHOLDER;

  return {
    layout,
    repoRelativePath,
    slug,
    summary,
  };
};

const scanSkillsLayout = (
  monorepoRoot: string,
  layout: SkillRegistryLayout,
  skillsDir: string,
): RepoSkillEntry[] => {
  const absoluteSkillsDir = join(monorepoRoot, skillsDir);

  if (!existsSync(absoluteSkillsDir)) {
    return [];
  }

  let dirents: ReturnType<typeof readdirSync>;
  try {
    dirents = readdirSync(absoluteSkillsDir, { withFileTypes: true });
  } catch {
    return [];
  }

  const entries: RepoSkillEntry[] = [];

  for (const dirent of dirents) {
    if (!dirent.isDirectory()) {
      continue;
    }

    const folderName = dirent.name;
    const skillFilePath = join(absoluteSkillsDir, folderName, SKILL_FILE_NAME);

    if (!existsSync(skillFilePath)) {
      continue;
    }

    entries.push(readSkillEntry(layout, skillsDir, folderName, skillFilePath));
  }

  return entries;
};

/**
 * @description Discovers repo skills under `.agents/skills` and `.cursor/skills`.
 * Returns an empty list when `monorepoRoot` is null or skill directories are absent.
 *
 * Pass the result of {@link getMonorepoRoot} (honors `WORKSPACE_ROOT`, then cwd walk-up).
 * Deployed apps without a checkout should set `WORKSPACE_ROOT` or accept an empty Skills UI.
 *
 * @see applications/openthrottle-developer/docs/repo-skills-discovery-design.md
 */
export const discoverRepoSkills = (
  monorepoRoot: string | null,
): readonly RepoSkillEntry[] => {
  if (!monorepoRoot) {
    return [];
  }

  const entries: RepoSkillEntry[] = [];

  for (const { layout, skillsDir } of LAYOUT_SCAN_TARGETS) {
    entries.push(...scanSkillsLayout(monorepoRoot, layout, skillsDir));
  }

  return sortRepoSkillEntries(entries);
};
