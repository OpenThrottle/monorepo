import { Dirent, readdirSync } from 'fs';
import { execSync } from 'child_process';
import { join } from 'path';
import pluralize from 'pluralize';
import { camelCase, kebabCase, upperFirst } from 'lodash';
import { logger } from '@nx/devkit';
import { getProjectsByTag } from './projects';

/**
 * @description A little helper that gets the current git username
 * which we use in some of our generators.
 */
export const getGithubUsername = () => {
  if (process.env.NODE_ENV === 'test') return 'test-username';

  const getUsername = "gh api user | jq -r '.login'";
  const value = execSync(getUsername).toString().replace(/\n/g, '');

  const isValid = value !== 'null';
  const username = isValid ? value : 'localhost';

  return username;
};

export const getDirectoriesAtPath = (path: string) => {
  const root = getMonorepoRoot();

  const pathname = join(root, path);
  const results = readdirSync(pathname, { withFileTypes: true });
  const directories = filterDirectories(results);

  return directories;
};

/**
 * @description A little helper to display the overview of a generator
 * in a nice format. We should use this for all generators to create a
 * consistent look and feel.
 */
export const getGeneratorOverview = async (name: string, overview: string) => {
  logger.log(`\n\n ----------------------------------------- \n\n`);
  logger.log(`  🤖 Generating a new "${name}" \n`);
  logger.log(`  ${overview} \n`);
  logger.log(`\n ----------------------------------------- \n\n`);

  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(true);
    }, 1000);
  });
};

/**
 * Returns an array of all the "applications" in the monorepo.
 */
export const getMonorepoRoot = () => {
  const dir = __dirname;
  const path = join(dir, '../../../../');

  return path;
};

export const getRemixRoutingFolders = (application: string) => {
  const root = getMonorepoRoot();
  const routing = `applications/${application}/app/routing`;
  const folder = join(root, routing);
  const items = readdirSync(folder, { withFileTypes: true });

  // Filter our the template directory
  const filters = ['__template__'];
  const filtered = items.filter((item) => !filters.includes(item.name));

  return filterDirectories(filtered);
};

export const getRemixServiceFolders = (application: string) => {
  const root = getMonorepoRoot();
  const services = `applications/${application}/app/services`;
  const folder = join(root, services);
  const items = readdirSync(folder, { withFileTypes: true });

  // Filter our the template directory
  const filters = ['__template__'];
  const filtered = items.filter((item) => !filters.includes(item.name));

  return filterDirectories(filtered);
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
