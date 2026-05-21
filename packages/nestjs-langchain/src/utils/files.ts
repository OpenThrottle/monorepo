import fs from 'fs';
import path from 'path';
import ignore from 'ignore';
import { glob } from 'glob';
import type { Extension } from '../loaders/markdown';

/**
 * Get the root directory of our
 */
function getRepositoryRoot(): string {
  return path.resolve(__dirname, '../../../../../');
}

/**
 * Get the .gitignore patterns for the repository
 */
function getGitignorePatterns(): string[] {
  const rootDir = getRepositoryRoot();
  const gitignorePath = path.join(rootDir, '.gitignore');

  if (!fs.existsSync(gitignorePath)) {
    return [];
  }

  const gitignoreContent = fs.readFileSync(gitignorePath, 'utf-8');
  const ignorePatterns = gitignoreContent
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'));

  // console.debug("ignorePatterns --> ", ignorePatterns);

  return ignorePatterns;
}

/**
 * @description Get all files by extension type, respecting .gitignore patterns
 */
export async function getFilesByExtension(
  extension: Extension,
): Promise<string[]> {
  const rootDir = getRepositoryRoot();
  const gitignorePatterns = getGitignorePatterns();

  // Create ignore instance
  const ig = ignore();
  ig.add(gitignorePatterns);

  // Get all files with the specified extension
  const pattern = `**/*.${extension}`;
  const allFiles = await glob(pattern, {
    absolute: true,
    cwd: rootDir,
    ignore: ['.git/**', 'node_modules/**', '**/node_modules/**'], // Always ignore these
  });

  // Filter out files that match .gitignore patterns
  const relativeFiles = allFiles.map((file: string) =>
    path.relative(rootDir, file),
  );
  const filteredFiles = relativeFiles.filter(
    (file: string) => !ig.ignores(file),
  );

  // Return absolute paths
  return filteredFiles.map((file: string) => path.join(rootDir, file));
}
