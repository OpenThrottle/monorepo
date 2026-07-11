import type { Dirent } from 'node:fs';
import { readdirSync, readFileSync, realpathSync } from 'node:fs';
import { basename, join, relative, sep } from 'node:path';

import type {
  AgentAssetKind,
  AgentAssetValidationIssue,
} from './schemas/agent-asset-frontmatter.schemas.ts';

export interface AgentAssetFileEntry {
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
const SKIP_RULE_BASENAMES = new Set(['nx-rules.mdc']);

const toRepoRelativePath = (
  monorepoRoot: string,
  absolutePath: string,
): string => relative(monorepoRoot, absolutePath).split('\\').join('/');

const describeError = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

const isErrnoException = (error: unknown): error is NodeJS.ErrnoException =>
  error instanceof Error && 'code' in error;

/**
 * Returns `true` when `candidate` is `root` itself or lives somewhere beneath
 * it. Both paths are expected to be absolute (and ideally already resolved via
 * `realpathSync`). Used to assert that a symlink target cannot escape the
 * `.agents/` tree before its contents are ingested.
 */
const isWithinRoot = (root: string, candidate: string): boolean => {
  if (candidate === root) {
    return true;
  }
  const rootWithSep = root.endsWith(sep) ? root : `${root}${sep}`;
  return candidate.startsWith(rootWithSep);
};

/**
 * Resolves a path to its canonical real location, tolerating a missing target
 * (ENOENT) or other errors. Returns `undefined` and records a warning instead
 * of throwing so a single dangling/unreadable symlink cannot abort the walk.
 */
const realpathSafely = (
  monorepoRoot: string,
  absolutePath: string,
  warnings: AgentAssetValidationIssue[],
): string | undefined => {
  try {
    return realpathSync(absolutePath);
  } catch (error) {
    if (isErrnoException(error) && error.code === 'ENOENT') {
      return undefined;
    }

    warnings.push({
      field: '(filesystem)',
      message: `Failed to resolve path: ${describeError(error)}`,
      path: toRepoRelativePath(monorepoRoot, absolutePath),
      severity: 'warning',
    });
    return undefined;
  }
};

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
    if (!dirent.isDirectory()) {
      continue;
    }

    const slug = dirent.name;
    const skillPath = join(skillsRoot, slug, 'SKILL.md');
    const content = readFileSafely(monorepoRoot, skillPath, warnings);
    if (content === undefined) {
      continue;
    }

    results.push({
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

const walkRuleFiles = (
  monorepoRoot: string,
  warnings: AgentAssetValidationIssue[],
): AgentAssetFileEntry[] => {
  const rulesRoot = join(monorepoRoot, '.agents/rules');
  const results: AgentAssetFileEntry[] = [];

  // Canonical root used both as the cycle-guard anchor and to assert that no
  // resolved directory escapes the `.agents/rules` subtree. If the root itself
  // cannot be resolved (e.g. it does not exist), there is nothing to walk.
  const canonicalRulesRoot = realpathSafely(monorepoRoot, rulesRoot, warnings);
  if (canonicalRulesRoot === undefined) {
    return results;
  }

  // Real paths already descended into, so a symlinked directory cycle cannot
  // cause infinite recursion / stack overflow.
  const visitedRealDirs = new Set<string>([canonicalRulesRoot]);

  const walkDir = (dir: string): void => {
    const entries = readDirSafely(monorepoRoot, dir, warnings);
    if (entries === undefined) {
      return;
    }

    for (const dirent of entries) {
      const absolutePath = join(dir, dirent.name);

      // Skip symlinks entirely (files or dirs). A symlinked directory could
      // form a cycle or point outside `.agents/`, silently ingesting
      // out-of-tree content; a symlinked file could likewise escape the root.
      if (dirent.isSymbolicLink()) {
        continue;
      }

      if (dirent.isDirectory()) {
        const canonicalDir = realpathSafely(
          monorepoRoot,
          absolutePath,
          warnings,
        );
        if (canonicalDir === undefined) {
          continue;
        }
        // Defense in depth: never descend outside the rules subtree or into a
        // directory we have already visited.
        if (
          !isWithinRoot(canonicalRulesRoot, canonicalDir) ||
          visitedRealDirs.has(canonicalDir)
        ) {
          continue;
        }
        visitedRealDirs.add(canonicalDir);
        walkDir(absolutePath);
        continue;
      }

      if (!dirent.isFile() || !dirent.name.endsWith('.mdc')) {
        continue;
      }
      if (SKIP_RULE_BASENAMES.has(dirent.name)) {
        continue;
      }

      // Assert the resolved file stays under the rules subtree before reading.
      const canonicalFile = realpathSafely(
        monorepoRoot,
        absolutePath,
        warnings,
      );
      if (
        canonicalFile === undefined ||
        !isWithinRoot(canonicalRulesRoot, canonicalFile)
      ) {
        continue;
      }

      const content = readFileSafely(monorepoRoot, absolutePath, warnings);
      if (content === undefined) {
        continue;
      }

      results.push({
        content,
        kind: 'rule',
        path: toRepoRelativePath(monorepoRoot, absolutePath),
        slug: undefined,
      });
    }
  };

  walkDir(rulesRoot);
  return results;
};

/**
 * @description Walks `.agents/` SSOT trees for skills, personas, rules, and prompts. A missing root is treated as empty; other per-entry filesystem failures (TOCTOU races, EACCES, special files) are skipped and surfaced as warnings rather than thrown.
 * @public
 */
export const walkAgentAssetFiles = (
  options: WalkAgentAssetsOptions,
): WalkAgentAssetFilesResult => {
  const { monorepoRoot } = options;
  const warnings: AgentAssetValidationIssue[] = [];

  const files = [
    ...walkSkillFiles(monorepoRoot, warnings),
    ...walkPersonaFiles(monorepoRoot, warnings),
    ...walkRuleFiles(monorepoRoot, warnings),
    ...walkPromptFiles(monorepoRoot, warnings),
  ];

  return { files, warnings };
};
