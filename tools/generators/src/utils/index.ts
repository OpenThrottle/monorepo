import type { Dirent } from 'fs';
import { readdirSync } from 'fs';
import { execSync } from 'child_process';
import { join } from 'path';
import pluralize from 'pluralize';
import { camelCase, kebabCase, upperFirst } from 'lodash';
import { logger } from '@nx/devkit';
import { getProjectsByTag } from './projects';

/**
 * A little helper that gets the current git username which we use in some of
 * our generators.
 */
export const getGithubUsername = () => {
  if (process.env.NODE_ENV === 'test') return 'test-username';

  // `gh`/`jq` may be missing (CI, fresh machines). Fall back to the existing
  // 'localhost' sentinel instead of crashing the generator with a shell error.
  try {
    const getUsername = "gh api user | jq -r '.login'";
    const value = execSync(getUsername).toString().replace(/\n/g, '');

    const isValid = value !== 'null' && value !== '';
    return isValid ? value : 'localhost';
  } catch {
    return 'localhost';
  }
};

/**
 * A little helper to display the overview of a generator in a nice format.
 * We should use this for all generators to create a consistent look and feel.
 */
export const getGeneratorOverview = async (name: string, overview: string) => {
  logger.log(`\n\n ----------------------------------------- \n\n`);
  logger.log(`  🤖 Generating a new "${name}" \n`);
  logger.log(`  ${overview} \n`);
  logger.log(`\n ----------------------------------------- \n\n`);

  return Promise.resolve(true);
};

/**
 * Returns an array of all the "applications" in the monorepo.
 */
const getMonorepoRoot = () => {
  const dir = __dirname;
  const path = join(dir, '../../../../');

  return path;
};

/**
 * Rejects application names that could escape the intended
 * `applications/<application>/...` directory (path traversal / disclosure).
 */
const assertSafeApplicationName = (application: string) => {
  const isUnsafe =
    application.includes('..') ||
    application.includes('/') ||
    application.includes('\\') ||
    application.trim() === '';

  if (isUnsafe) {
    throw new Error(
      `Invalid application name "${application}": must not be empty or contain path separators or "..".`,
    );
  }
};

/**
 * Reads the immediate child directories of an application folder, filtering out
 * the `__template__` directory. Throws an actionable error naming the expected
 * path when the directory is missing or unreadable.
 */
const readApplicationFolders = (application: string, relative: string) => {
  assertSafeApplicationName(application);

  const root = getMonorepoRoot();
  const expected = `applications/${application}/app/${relative}`;
  const folder = join(root, expected);

  try {
    const items = readdirSync(folder, { withFileTypes: true });

    // Filter out the template directory
    const filters = ['__template__'];
    const filtered = items.filter((item) => !filters.includes(item.name));

    return filterDirectories(filtered);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Unable to read "${expected}" (resolved to "${folder}"): ${reason}`,
    );
  }
};

export const getRemixRoutingFolders = (application: string) => {
  return readApplicationFolders(application, 'routing');
};

export const getRemixServiceFolders = (application: string) => {
  return readApplicationFolders(application, 'services');
};

/**
 * Returns an array of all the "applications" in the monorepo.
 */
export const getMonorepoApplications = async () => {
  const projects = await getProjectsByTag('type:application');
  const applications = projects.map((project) => project.name);
  const sorted = applications.sort();

  return sorted;
};

/**
 * Filters files from a list of "Dirent" objects.
 */
const filterDirectories = (dirs: Dirent[]) => {
  return dirs.filter((dir) => dir.isDirectory()).map((dir) => dir.name);
};

/**
 * These are the commonly naming conventions we use in our templates.
 */
export const getCommonVariables = (name: string) => {
  const plural = pluralize.plural(name);
  const singular = pluralize.singular(name);

  const variations = {
    name: name,
    nameCamel: camelCase(name),
    nameKebab: kebabCase(name),
    namePascal: upperFirst(camelCase(name)),
    nameUppercase: name.toUpperCase(),
    plural: plural,
    pluralCamel: camelCase(plural),
    pluralKebab: kebabCase(plural),
    pluralPascal: upperFirst(camelCase(plural)),
    pluralUppercase: plural.toUpperCase(),
    singular: singular,
    singularCamel: camelCase(singular),
    singularKebab: kebabCase(singular),
    singularPascal: upperFirst(camelCase(singular)),
    singularUppercase: singular.toUpperCase(),
  } as const;

  return variations;
};
