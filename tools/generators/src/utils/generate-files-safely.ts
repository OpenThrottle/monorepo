import { join, relative } from 'path';
import type { Tree } from '@nx/devkit';
import { generateFiles, logger } from '@nx/devkit';

/** Staging root inside the tree; never survives a call. */
const STAGING_ROOT = '.tools-generators-staging';

let stagingCounter = 0;

const collectFiles = (tree: Tree, directory: string): string[] => {
  const entries = tree.children(directory);

  return entries.flatMap((entry) => {
    const path = join(directory, entry);

    return tree.isFile(path) ? [path] : collectFiles(tree, path);
  });
};

export interface GenerateFilesSafelyResult {
  readonly skipped: readonly string[];
  readonly written: readonly string[];
}

/**
 * `generateFiles` from @nx/devkit overwrites whatever is already there and
 * reports the destruction as `UPDATE`. Regenerating a component to check
 * conventions therefore replaced hand-written `__tests__/<Name>.test.tsx`
 * files with the starter stub.
 *
 * This renders the templates into a staging directory inside the tree, then
 * copies out only the files that do not already exist. Existing files are left
 * untouched and reported as skipped, so the generator never destroys work it
 * did not create.
 *
 * @public
 */
export const generateFilesSafely = (
  tree: Tree,
  templates: string,
  destination: string,
  variables: Record<string, unknown>,
): GenerateFilesSafelyResult => {
  stagingCounter += 1;
  const staging = join(STAGING_ROOT, String(stagingCounter));

  generateFiles(tree, templates, staging, variables);

  const skipped: string[] = [];
  const written: string[] = [];

  collectFiles(tree, staging).forEach((source) => {
    const target = join(destination, relative(staging, source));

    if (tree.exists(target)) {
      skipped.push(target);
    } else {
      const contents = tree.read(source);
      if (contents) tree.write(target, contents);
      written.push(target);
    }
  });

  tree.delete(staging);

  skipped.forEach((path) => {
    logger.warn(`SKIPPED (already exists, left untouched): ${path}`);
  });

  return { skipped, written };
};
