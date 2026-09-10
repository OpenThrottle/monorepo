import type { Dirent } from 'node:fs';
import { readdirSync, readFileSync, realpathSync, statSync } from 'node:fs';
import { basename, join, relative, sep } from 'node:path';

import type {
  AgentAssetKind,
  AgentAssetValidationIssue,
} from './schemas/agent-asset-frontmatter.schemas.ts';

export interface AgentAssetFileEntry {
  /**
   * Skill-only: whether the skill folder resolves under the repo's authored
   * `skills/` tree (the ot-skill-sync layout symlinks authored skills into
   * `.agents/skills/`; lockfile-installed external skills are real
   * directories there). `undefined` for non-skill assets.
   */
  readonly authored?: boolean;
  readonly content: string;
  readonly kind: AgentAssetKind;
  readonly path: string;
  readonly slug: string | undefined;
}

export interface WalkAgentAssetsOptions {
  readonly monorepoRoot: string;
}

export interface WalkAgentAssetFilesResult {
  readonly files: readonly AgentAssetFileEntry[];
  readonly warnings: readonly AgentAssetValidationIssue[];
}

const SKIP_BASENAMES = new Set(['README.md', '_template.md']);

const toRepoRelativePath = (
  monorepoRoot: string,
  absolutePath: string,
): string => relative(monorepoRoot, absolutePath).split('\\').join('/');

const describeError = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

const isErrnoException = (error: unknown): error is NodeJS.ErrnoException =>
  error instanceof Error && 'code' in error;

/**
 * Reads a directory's entries, tolerating a missing directory (ENOENT) or a
 * path that has been replaced by a non-directory (e.g. a special file).
 * Returns `undefined` instead of throwing so a single bad path cannot abort
 * the whole walk; a missing root is treated as "nothing to walk" (no warning),
 * while other failures are surfaced as warnings.
 */
const readDirSafely = (
  monorepoRoot: string,
  dir: string,
  warnings: AgentAssetValidationIssue[],
): readonly Dirent[] | undefined => {
  try {
    return readdirSync(dir, { withFileTypes: true });
  } catch (error) {
    if (isErrnoException(error) && error.code === 'ENOENT') {
      return undefined;
    }

    warnings.push({
      field: '(filesystem)',
      message: `Failed to read directory: ${describeError(error)}`,
      path: toRepoRelativePath(monorepoRoot, dir),
      severity: 'warning',
    });
    return undefined;
  }
};

/**
 * Reads a file's UTF-8 contents, tolerating files that vanish between listing
 * and read (TOCTOU) or that are unreadable (EACCES). Returns `undefined` and
 * records a warning instead of throwing.
 */
const readFileSafely = (
  monorepoRoot: string,
  absolutePath: string,
  warnings: AgentAssetValidationIssue[],
): string | undefined => {
  try {
    return readFileSync(absolutePath, 'utf8');
  } catch (error) {
    warnings.push({
      field: '(filesystem)',
      message: `Failed to read file: ${describeError(error)}`,
      path: toRepoRelativePath(monorepoRoot, absolutePath),
      severity: 'warning',
    });
    return undefined;
  }
};

/**
 * A skill folder is a real directory OR a symlink resolving to a directory
 * that stays inside the monorepo — the ot-skill-sync layout links the repo's
 * authored `skills/<slug>` dirs into `.agents/skills/` while external
 * installs stay real directories. Links escaping the repo are skipped. `authored`
 * is true when the
 * folder's real path lives under `<monorepoRoot>/skills/` — the virtual
 * provenance signal (a generated symlink chain resolves there; a
 * lockfile-installed real dir does not).
 */
const resolveSkillFolder = (
  monorepoRoot: string,
  skillsRoot: string,
  dirent: Dirent,
): { readonly authored: boolean } | undefined => {
  if (!dirent.isDirectory() && !dirent.isSymbolicLink()) {
    return undefined;
  }
  try {
    const target = join(skillsRoot, dirent.name);
    if (!statSync(target).isDirectory()) {
      return undefined;
    }
    const realRoot = realpathSync(monorepoRoot);
    const realTarget = realpathSync(target);
    if (
      dirent.isSymbolicLink() &&
      !realTarget.startsWith(`${realRoot}${sep}`)
    ) {
      return undefined;
    }
    return {
      authored: realTarget.startsWith(`${realRoot}${sep}skills${sep}`),
    };
  } catch {
    return undefined;
  }
};

const walkSkillFiles = (
  monorepoRoot: string,
  warnings: AgentAssetValidationIssue[],
): AgentAssetFileEntry[] => {
  const skillsRoot = join(monorepoRoot, '.agents/skills');
  const entries = readDirSafely(monorepoRoot, skillsRoot, warnings);
  if (entries === undefined) {
    return [];
  }

  const results: AgentAssetFileEntry[] = [];

  for (const dirent of entries) {
    const folder = resolveSkillFolder(monorepoRoot, skillsRoot, dirent);
    if (folder === undefined) {
      continue;
    }

    const slug = dirent.name;
    const skillPath = join(skillsRoot, slug, 'SKILL.md');
    const content = readFileSafely(monorepoRoot, skillPath, warnings);
    if (content === undefined) {
      continue;
    }

    results.push({
      authored: folder.authored,
      content,
      kind: 'skill',
      path: toRepoRelativePath(monorepoRoot, skillPath),
      slug,
    });
  }

  return results;
};

const walkPersonaFiles = (
  monorepoRoot: string,
  warnings: AgentAssetValidationIssue[],
): AgentAssetFileEntry[] => {
  const personasRoot = join(monorepoRoot, '.agents/personas');
  const entries = readDirSafely(monorepoRoot, personasRoot, warnings);
  if (entries === undefined) {
    return [];
  }

  const results: AgentAssetFileEntry[] = [];

  for (const dirent of entries) {
    if (!dirent.isFile() || !dirent.name.endsWith('.md')) {
      continue;
    }
    if (SKIP_BASENAMES.has(dirent.name)) {
      continue;
    }

    const slug = basename(dirent.name, '.md');
    const personaPath = join(personasRoot, dirent.name);
    const content = readFileSafely(monorepoRoot, personaPath, warnings);
    if (content === undefined) {
      continue;
    }

    results.push({
      content,
      kind: 'persona',
      path: toRepoRelativePath(monorepoRoot, personaPath),
      slug,
    });
  }

  return results;
};

const walkPromptFiles = (
  monorepoRoot: string,
  warnings: AgentAssetValidationIssue[],
): AgentAssetFileEntry[] => {
  const promptsRoot = join(monorepoRoot, '.agents/prompts');
  const entries = readDirSafely(monorepoRoot, promptsRoot, warnings);
  if (entries === undefined) {
    return [];
  }

  const results: AgentAssetFileEntry[] = [];

  for (const dirent of entries) {
    if (!dirent.isFile() || !dirent.name.endsWith('.md')) {
      continue;
    }
    if (SKIP_BASENAMES.has(dirent.name)) {
      continue;
    }

    const slug = basename(dirent.name, '.md');
    const promptPath = join(promptsRoot, dirent.name);
    const content = readFileSafely(monorepoRoot, promptPath, warnings);
    if (content === undefined) {
      continue;
    }

    results.push({
      content,
      kind: 'prompt',
      path: toRepoRelativePath(monorepoRoot, promptPath),
      slug,
    });
  }

  return results;
};

/**
 * @description Walks `.agents/` SSOT trees for skills, personas, and prompts. A missing root is treated as empty; other per-entry filesystem failures (TOCTOU races, EACCES, special files) are skipped and surfaced as warnings rather than thrown.
 * @publicApi
 */
export const walkAgentAssetFiles = (
  options: WalkAgentAssetsOptions,
): WalkAgentAssetFilesResult => {
  const { monorepoRoot } = options;
  const warnings: AgentAssetValidationIssue[] = [];

  const files = [
    ...walkSkillFiles(monorepoRoot, warnings),
    ...walkPersonaFiles(monorepoRoot, warnings),
    ...walkPromptFiles(monorepoRoot, warnings),
  ];

  return { files, warnings };
};
