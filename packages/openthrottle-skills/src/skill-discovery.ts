import type { Dirent } from 'node:fs';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { parseSkillFrontmatterForValidation } from './agent-asset-frontmatter.ts';
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

const describeError = (error: unknown): string => {
  return error instanceof Error ? error.message : String(error);
};

const isErrnoException = (error: unknown): error is NodeJS.ErrnoException => {
  return error instanceof Error && 'code' in error;
};

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

/**
 * Source layer a resolved skill came from. The target repo is never a layer in
 * the manifest — its skills are the exclusion set, not injected content — so
 * only the two injected layers appear here.
 *
 * @public
 */
export const FOREIGN_SKILL_LAYER = {
  otCurated: 'ot-curated',
  personal: 'personal',
} as const;

/** @public */
export type ForeignSkillLayer =
  (typeof FOREIGN_SKILL_LAYER)[keyof typeof FOREIGN_SKILL_LAYER];

/**
 * One entry in the resolved manifest: a skill that should be projected into the
 * foreign repo, tagged with the layer that won its name.
 *
 * @public
 */
export interface ForeignSkillManifestEntry {
  readonly layer: ForeignSkillLayer;
  readonly name: string;
  readonly sourcePath: string;
}

/**
 * @public
 */
export interface ResolveForeignSkillManifestInput {
  /**
   * Absolute path to the OpenThrottle curated SSOT skills root
   * (`<OT_ROOT>/skills`). Discovered as the base layer.
   */
  readonly otCuratedSkillsDir: string;
  /**
   * Absolute path to the opt-in per-user experimental skills root. `undefined`
   * (feature off) is a clean no-op — the manifest is OT-curated only.
   */
  readonly personalSkillsDir?: string | undefined;
  /**
   * Skill names the target repo already defines (basenames present under its
   * own `.agents/skills` / `.claude/skills`). These are excluded from the
   * manifest so the target repo always wins on a name collision.
   */
  readonly targetRepoSkillNames?: Iterable<string> | undefined;
}

/**
 * @public
 */
export interface ResolveForeignSkillManifestResult {
  readonly entries: readonly ForeignSkillManifestEntry[];
  readonly warnings: readonly string[];
}

/**
 * @description Resolves the ordered, de-duplicated skill manifest to project
 * into a foreign repo, applying the locked three-layer precedence: OT curated
 * (`skills/`) < personal/experimental (per-user dir) < target repo.
 *
 * - **Personal overrides OT curated** on a name collision between the two
 *   injected layers.
 * - **The target repo wins outright**: any name in `targetRepoSkillNames` is
 *   dropped from the manifest entirely (never masked), so target-wins is
 *   enforced here at resolve time rather than by racing a link on disk.
 * - **Personal dir absent/unset is a clean no-op** — OT curated only.
 *
 * Discovery reads the two source roots (via {@link discoverSkillDirs}) but this
 * performs **no filesystem mutation**; it only computes what should be linked.
 * Entries are sorted by name for a deterministic manifest.
 *
 * @public
 */
export const resolveForeignSkillManifest = (
  input: ResolveForeignSkillManifestInput,
): ResolveForeignSkillManifestResult => {
  const { otCuratedSkillsDir, personalSkillsDir, targetRepoSkillNames } = input;

  const warnings: string[] = [];

  const otCurated = discoverSkillDirs(otCuratedSkillsDir);
  warnings.push(...otCurated.warnings);

  const byName = new Map<string, ForeignSkillManifestEntry>();
  for (const skill of otCurated.skills) {
    byName.set(skill.name, {
      layer: FOREIGN_SKILL_LAYER.otCurated,
      name: skill.name,
      sourcePath: skill.path,
    });
  }

  // Personal layer overrides OT curated on collision. Absent dir → no-op.
  if (personalSkillsDir !== undefined && personalSkillsDir !== '') {
    const personal = discoverSkillDirs(personalSkillsDir);
    warnings.push(...personal.warnings);
    for (const skill of personal.skills) {
      byName.set(skill.name, {
        layer: FOREIGN_SKILL_LAYER.personal,
        name: skill.name,
        sourcePath: skill.path,
      });
    }
  }

  // Target repo wins: drop any name the target already owns.
  const excluded = new Set(targetRepoSkillNames ?? []);
  for (const name of excluded) {
    byName.delete(name);
  }

  const entries = [...byName.values()].sort((a, b) =>
    a.name.localeCompare(b.name),
  );

  return { entries, warnings };
};
