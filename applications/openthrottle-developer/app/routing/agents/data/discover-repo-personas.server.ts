import { existsSync, readdirSync, readFileSync } from 'node:fs';
import type { Dirent } from 'node:fs';
import { basename, join } from 'node:path';

import { parsePersonaFrontmatter } from '~/routing/agents/data/parse-persona-frontmatter.server';
import type { RepoPersonaEntry } from '~/routing/agents/data/repo-personas-registry';

const PERSONAS_DIR = '.agents/personas';

const SKIP_BASENAMES = new Set(['README.md', '_template.md']);

const MISSING_SUMMARY_PLACEHOLDER = 'No description in persona frontmatter.';

const sortRepoPersonaEntries = (
  entries: RepoPersonaEntry[],
): readonly RepoPersonaEntry[] =>
  [...entries].sort((left, right) => left.slug.localeCompare(right.slug));

const readPersonaEntry = (
  fileName: string,
  personaFilePath: string,
): RepoPersonaEntry => {
  const fileSlug = basename(fileName, '.md');
  const repoRelativePath = `${PERSONAS_DIR}/${fileName}`;
  let fileContent = '';

  try {
    fileContent = readFileSync(personaFilePath, 'utf8');
  } catch {
    return {
      repoRelativePath,
      slug: fileSlug,
      summary: MISSING_SUMMARY_PLACEHOLDER,
    };
  }

  const { description, name } = parsePersonaFrontmatter(fileContent);
  const slug = name && name.trim().length > 0 ? name.trim() : fileSlug;
  const summary =
    description && description.trim().length > 0
      ? description.trim()
      : MISSING_SUMMARY_PLACEHOLDER;

  return {
    repoRelativePath,
    slug,
    summary,
  };
};

const scanPersonasDir = (monorepoRoot: string): RepoPersonaEntry[] => {
  const absolutePersonasDir = join(monorepoRoot, PERSONAS_DIR);

  if (!existsSync(absolutePersonasDir)) {
    return [];
  }

  let dirents: Dirent<string>[];
  try {
    dirents = readdirSync(absolutePersonasDir, { withFileTypes: true });
  } catch {
    return [];
  }

  const entries: RepoPersonaEntry[] = [];

  for (const dirent of dirents) {
    if (!dirent.isFile() || !dirent.name.endsWith('.md')) {
      continue;
    }
    if (SKIP_BASENAMES.has(dirent.name)) {
      continue;
    }

    entries.push(
      readPersonaEntry(dirent.name, join(absolutePersonasDir, dirent.name)),
    );
  }

  return entries;
};

/**
 * @description Discovers repo personas under `.agents/personas/*.md`.
 * Returns an empty list when `monorepoRoot` is null or the personas directory is absent.
 */
export const discoverRepoPersonas = (
  monorepoRoot: string | null,
): readonly RepoPersonaEntry[] => {
  if (!monorepoRoot) {
    return [];
  }

  return sortRepoPersonaEntries(scanPersonasDir(monorepoRoot));
};

/**
 * @description Finds one persona by slug (frontmatter `name` or filename id).
 */
export const findRepoPersonaBySlug = (
  monorepoRoot: string | null,
  slug: string,
): RepoPersonaEntry | null => {
  const normalizedSlug = slug.trim();
  if (!normalizedSlug) {
    return null;
  }

  return (
    discoverRepoPersonas(monorepoRoot).find(
      (entry) => entry.slug === normalizedSlug,
    ) ?? null
  );
};

/**
 * @description Reads persona markdown body from disk for read-only detail views.
 */
export const readRepoPersonaFileContent = (
  monorepoRoot: string | null,
  repoRelativePath: string,
): string | null => {
  if (!monorepoRoot) {
    return null;
  }

  const absolutePath = join(monorepoRoot, repoRelativePath);
  try {
    return readFileSync(absolutePath, 'utf8');
  } catch {
    return null;
  }
};
