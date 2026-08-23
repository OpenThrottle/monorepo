import {
  existsSync,
  readdirSync,
  readFileSync,
  realpathSync,
  statSync,
} from 'node:fs';
import type { Dirent } from 'node:fs';
import { join, sep } from 'node:path';

import {
  deriveSkillSourceUrl,
  parseSkillsLockFile,
  SKILLS_LOCK_FILENAME,
  type SkillsLockMap,
  type SkillSource,
} from '@openthrottle/openthrottle-skills';
import { parseSkillFrontmatter } from '~/routing/agents/data/parse-skill-frontmatter.server';
import {
  dedupeRepoSkillEntriesBySlug,
  type RepoSkillEntry,
  type SkillRegistryLayout,
} from '~/routing/agents/data/repo-skills-registry';

const SKILL_FILE_NAME = 'SKILL.md';

const MISSING_SUMMARY_PLACEHOLDER = 'No description in SKILL.md frontmatter.';

// Every layout a supported CLI reads in-repo. `.agents/skills` is the canonical
// SSOT view; the rest are per-CLI dirs that resolve back into it via generated
// symlinks (Claude Code, Codex, Cursor 2.4+, Grok Build, OpenCode all read the
// SKILL.md standard, differing only in scanned directory). Per-tool GLOBAL dirs
// (~/.claude/skills, ~/.codex/skills, ~/.grok/skills) live outside the repo and
// are intentionally out of scope for this repo-rooted scan.
const LAYOUT_SCAN_TARGETS: ReadonlyArray<{
  readonly layout: SkillRegistryLayout;
  readonly skillsDir: string;
}> = [
  { layout: 'agents', skillsDir: '.agents/skills' },
  { layout: 'claude', skillsDir: '.claude/skills' },
  { layout: 'codex', skillsDir: '.codex/skills' },
  { layout: 'cursor', skillsDir: '.cursor/skills' },
  { layout: 'grok', skillsDir: '.grok/skills' },
  { layout: 'opencode', skillsDir: '.opencode/skills' },
] as const;

const LAYOUT_SORT_ORDER: Readonly<Record<SkillRegistryLayout, number>> = {
  agents: 0,
  claude: 1,
  codex: 2,
  cursor: 3,
  grok: 4,
  opencode: 5,
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

interface SkillProvenance {
  readonly source: SkillSource;
  readonly sourceUrl: string | undefined;
}

/**
 * Provenance is derived from the ot-skill-sync layout, never from frontmatter:
 * a skill folder whose real path resolves under `<root>/skills/` is authored
 * here (`openthrottle`); anything else is a lockfile install (`external`),
 * with its origin URL looked up from skills-lock.json by folder name.
 */
const deriveSkillProvenance = (
  monorepoRoot: string,
  absoluteSkillDir: string,
  folderName: string,
  lock: SkillsLockMap,
): SkillProvenance => {
  try {
    const realRoot = realpathSync(monorepoRoot);
    const realDir = realpathSync(absoluteSkillDir);
    if (realDir.startsWith(`${realRoot}${sep}skills${sep}`)) {
      return { source: 'openthrottle', sourceUrl: undefined };
    }
  } catch {
    // Unresolvable path — treat as external below.
  }

  return {
    source: 'external',
    sourceUrl: deriveSkillSourceUrl(lock[folderName]),
  };
};

const readSkillEntry = (
  monorepoRoot: string,
  layout: SkillRegistryLayout,
  skillsDir: string,
  folderName: string,
  skillFilePath: string,
  lock: SkillsLockMap,
): RepoSkillEntry => {
  const repoRelativePath = toRepoRelativePath(skillsDir, folderName);
  const { source, sourceUrl } = deriveSkillProvenance(
    monorepoRoot,
    join(monorepoRoot, skillsDir, folderName),
    folderName,
    lock,
  );
  let fileContent = '';

  try {
    fileContent = readFileSync(skillFilePath, 'utf8');
  } catch {
    return {
      disableModelInvocation: undefined,
      layout,
      repoRelativePath,
      slug: folderName,
      source,
      sourceUrl,
      summary: MISSING_SUMMARY_PLACEHOLDER,
      tags: undefined,
    };
  }

  const { description, disableModelInvocation, name, tags } =
    parseSkillFrontmatter(fileContent);
  const slug = name && name.trim().length > 0 ? name.trim() : folderName;
  const summary =
    description && description.trim().length > 0
      ? description.trim()
      : MISSING_SUMMARY_PLACEHOLDER;

  return {
    disableModelInvocation,
    layout,
    repoRelativePath,
    slug,
    source,
    sourceUrl,
    summary,
    tags,
  };
};

const isSkillFolder = (
  absoluteSkillsDir: string,
  folderName: string,
  dirent: Dirent<string>,
): boolean => {
  if (dirent.isDirectory()) {
    return true;
  }
  if (!dirent.isSymbolicLink()) {
    return false;
  }
  try {
    return statSync(join(absoluteSkillsDir, folderName)).isDirectory();
  } catch {
    return false;
  }
};

const readSkillsLock = (monorepoRoot: string): SkillsLockMap => {
  try {
    return parseSkillsLockFile(
      readFileSync(join(monorepoRoot, SKILLS_LOCK_FILENAME), 'utf8'),
    );
  } catch {
    return {};
  }
};

const scanSkillsLayout = (
  monorepoRoot: string,
  layout: SkillRegistryLayout,
  skillsDir: string,
  lock: SkillsLockMap,
): RepoSkillEntry[] => {
  const absoluteSkillsDir = join(monorepoRoot, skillsDir);

  if (!existsSync(absoluteSkillsDir)) {
    return [];
  }

  let dirents: Dirent<string>[];
  try {
    dirents = readdirSync(absoluteSkillsDir, { withFileTypes: true });
  } catch {
    return [];
  }

  const entries: RepoSkillEntry[] = [];

  for (const dirent of dirents) {
    if (!isSkillFolder(absoluteSkillsDir, dirent.name, dirent)) {
      continue;
    }

    const folderName = dirent.name;
    const skillFilePath = join(absoluteSkillsDir, folderName, SKILL_FILE_NAME);

    if (!existsSync(skillFilePath)) {
      continue;
    }

    entries.push(
      readSkillEntry(
        monorepoRoot,
        layout,
        skillsDir,
        folderName,
        skillFilePath,
        lock,
      ),
    );
  }

  return entries;
};

/**
 * @description Discovers repo skills under `.agents/skills` (the SSOT view;
 * `.claude/skills` fan-out is scanned too and deduped by slug, preferring `.agents`).
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
  const lock = readSkillsLock(monorepoRoot);

  for (const { layout, skillsDir } of LAYOUT_SCAN_TARGETS) {
    entries.push(...scanSkillsLayout(monorepoRoot, layout, skillsDir, lock));
  }

  return sortRepoSkillEntries([...dedupeRepoSkillEntriesBySlug(entries)]);
};
