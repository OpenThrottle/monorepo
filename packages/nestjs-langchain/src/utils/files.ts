import fs from 'fs';
import path from 'path';
import ignore from 'ignore';
import { glob } from 'glob';
import type { Extension } from '../loaders/markdown';

/**
 * @description Resolve the directory to search from. Callers should pass an
 * explicit root; we fall back to the current working directory rather than a
 * brittle, monorepo-specific path traversal so this works when the package is
 * published and consumed outside this repo.
 */
function resolveRoot(rootDir?: string): string {
  return rootDir ? path.resolve(rootDir) : process.cwd();
}

/**
 * Get the .gitignore patterns for the given root directory
 */
function getGitignorePatterns(rootDir: string): string[] {
  const gitignorePath = path.join(rootDir, '.gitignore');

  if (!fs.existsSync(gitignorePath)) {
    return [];
  }

  const gitignoreContent = fs.readFileSync(gitignorePath, 'utf-8');
  const ignorePatterns = gitignoreContent
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'));

  return ignorePatterns;
}

/**
 * @description Get all files by extension type under `rootDir`, respecting
 * `.gitignore` patterns. Defaults to `process.cwd()` when no root is provided.
 */
export async function getFilesByExtension(
  extension: Extension,
  rootDir?: string,
): Promise<string[]> {
  const root = resolveRoot(rootDir);
  const gitignorePatterns = getGitignorePatterns(root);

  // Create ignore instance
  const ig = ignore();
  ig.add(gitignorePatterns);

  // Get all files with the specified extension
  const pattern = `**/*.${extension}`;
  const allFiles = await glob(pattern, {
    absolute: true,
    cwd: root,
    ignore: ['.git/**', 'node_modules/**', '**/node_modules/**'], // Always ignore these
  });

  // Filter out files that match .gitignore patterns
  const relativeFiles = allFiles.map((file: string) =>
    path.relative(root, file),
  );
  const filteredFiles = relativeFiles.filter(
    (file: string) => !ig.ignores(file),
  );

  // Return absolute paths
  return filteredFiles.map((file: string) => path.join(root, file));
}
