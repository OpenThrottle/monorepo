import type { Dirent } from 'node:fs';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { parseSkillFrontmatterForValidation } from './parse-skill-frontmatter.ts';
import { skillFrontmatterSchema } from './schemas/agent-asset-frontmatter.schemas.ts';

/**
 * A single skill directory discovered under a source root — the on-disk unit
 * the materializer projects into a foreign repo. `name` is the directory
 * basename (the key every agent CLI uses to address a skill); `path` is its
 * absolute location.
 *
 * @public
 */
export interface DiscoveredSkill {
  readonly name: string;
  readonly path: string;
}

/**
 * @public
 */
export interface DiscoverSkillDirsResult {
  readonly skills: readonly DiscoveredSkill[];
  readonly warnings: readonly string[];
}

const SKILL_FILENAME = 'SKILL.md';

const describeError = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

const isErrnoException = (error: unknown): error is NodeJS.ErrnoException =>
  error instanceof Error && 'code' in error;

/**
 * True when `dirent` is a directory, or a symlink whose target resolves to a
 * directory. Skill folders may be authored symlinks (the ot-skill-sync layout) as
 * well as real directories, so both are accepted.
 */
const direntIsSkillFolder = (root: string, dirent: Dirent): boolean => {
  if (dirent.isDirectory()) {
    return true;
  }
  if (!dirent.isSymbolicLink()) {
    return false;
  }
  try {
    return statSync(join(root, dirent.name)).isDirectory();
  } catch {
    return false;
  }
};

/**
 * @description Discovers skill directories under a single source root laid out
 * like OpenThrottle's authored `skills/` tree — each direct child directory
 * that contains a valid `SKILL.md` is a skill, keyed by its directory basename.
 *
 * Tolerant by design so one bad entry never aborts discovery: a missing root is
 * an empty result with no warning; a directory without `SKILL.md` is silently
 * skipped (not every folder is a skill); a `SKILL.md` that is unreadable or
 * whose frontmatter fails {@link skillFrontmatterSchema} is skipped **with a
 * warning** (malformed skills are non-fatal — see the personal/experimental
 * tier). Reuses the shared frontmatter parser/schema rather than a parallel
 * parser. Pure discovery — performs no mutation. Results are sorted by name.
 *
 * @public
 */
export const discoverSkillDirs = (rootDir: string): DiscoverSkillDirsResult => {
  const warnings: string[] = [];

  let entries: readonly Dirent[];
  try {
    entries = readdirSync(rootDir, { withFileTypes: true });
  } catch (error) {
    if (isErrnoException(error) && error.code === 'ENOENT') {
      return { skills: [], warnings: [] };
    }
    return {
      skills: [],
      warnings: [
        `Failed to read skills root ${rootDir}: ${describeError(error)}`,
      ],
    };
  }

  const skills: DiscoveredSkill[] = [];

  for (const dirent of entries) {
    if (!direntIsSkillFolder(rootDir, dirent)) {
      continue;
    }

    const skillPath = join(rootDir, dirent.name);
    const skillFile = join(skillPath, SKILL_FILENAME);

    let content: string;
    try {
      content = readFileSync(skillFile, 'utf8');
    } catch (error) {
      // No SKILL.md → not a skill directory; skip quietly. Any other read
      // failure (EACCES etc.) is surfaced as a warning.
      if (isErrnoException(error) && error.code === 'ENOENT') {
        continue;
      }
      warnings.push(`Failed to read ${skillFile}: ${describeError(error)}`);
      continue;
    }

    const parsed = skillFrontmatterSchema.safeParse(
      parseSkillFrontmatterForValidation(content),
    );
    if (!parsed.success) {
      warnings.push(
        `Skipping malformed skill ${dirent.name} (${skillFile}): ${parsed.error.issues
          .map((issue) => issue.message)
          .join('; ')}`,
      );
      continue;
    }

    skills.push({ name: dirent.name, path: skillPath });
  }

  skills.sort((a, b) => a.name.localeCompare(b.name));

  return { skills, warnings };
};
