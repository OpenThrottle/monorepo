import * as path from 'path';
import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import prompts from 'prompts';
import type { GeneratorCallback, Tree } from '@nx/devkit';
import {
  addDependenciesToPackageJson,
  formatFiles,
  generateFiles,
  installPackagesTask,
  logger,
  runTasksInSerial,
} from '@nx/devkit';
import { isInteractiveArgPresent } from '../../utils/nx-cli';
import { ORGANIZATIONS } from '../../utils/organizations';
import {
  getConfigConfirmation,
  getOrganizationName,
  getPackageName,
} from '../../utils/questions';
import { getCommonVariables } from '../../utils/index';
import { REGEX_SLUG } from '../../utils/regex';
import { writeJsonToStdout } from '../../utils/output';
import { throwGeneratorError } from '../../utils/generator-errors';

export interface PackageGeneratorSchema {
  readonly describe?: boolean;
  readonly interactive?: boolean;
  readonly list?: string;
  readonly name?: string;
  readonly organization?: string;
  readonly type?: 'nestjs' | 'node' | 'react' | 'tools';
}

export async function packageGenerator(
  tree: Tree,
  schema: PackageGeneratorSchema,
): Promise<GeneratorCallback | void> {
  const interactive = schema.interactive === true || isInteractiveArgPresent();

  if (schema.describe === true) {
    writeJsonToStdout({
      id: '@tools/generators:package',
      list: {
        organizations: {
          description: 'Static organization scopes.',
          values: [...ORGANIZATIONS],
        },
        types: {
          description: 'Static package types.',
          values: ['nestjs', 'node', 'react', 'tools'],
        },
      },
      options: {
        name: { pattern: 'slug', required: true, type: 'string' },
        organization: {
          enum: [...ORGANIZATIONS],
          required: true,
          type: 'string',
        },
        type: {
          enum: ['nestjs', 'node', 'react', 'tools'],
          required: true,
          type: 'string',
        },
      },
    });
    return;
  }

  if (schema.list) {
    const listKey = schema.list;

    if (listKey === 'types') {
      writeJsonToStdout(['nestjs', 'node', 'react', 'tools']);
      return;
    }

    if (listKey === 'organizations') {
      writeJsonToStdout([...ORGANIZATIONS]);
      return;
    }

    throwGeneratorError({
      code: 'unknown_list_key',
      field: 'list',
      message: `Unknown --list value "${listKey}".`,
      validValues: ['types', 'organizations'],
    });
  }

  const type =
    schema.type ?? (interactive ? await getPackageType() : undefined);
  if (!type) {
    throw new Error(
      `Missing required option: "type". Re-run with --interactive or pass --type=nestjs|node|react|tools.`,
    );
  }

  const org =
    schema.organization ??
    (interactive ? await getOrganizationName() : undefined);

  if (!org) {
    throw new Error(
      `Missing required option: "organization". Re-run with --interactive or pass --organization=<scope>.`,
    );
  }

  const orgName = org.replace('@', '');

  const name =
    schema.name ?? (interactive ? await getPackageName() : undefined);
  if (!name) {
    throw new Error(
      `Missing required option: "name". Re-run with --interactive or pass --name=<slug>.`,
    );
  }

  if (name.length < 3) {
    throw new Error(`Package name must be at least 3 characters.`);
  }
  if (!REGEX_SLUG.test(name)) {
    throw new Error(`Package name must be a slug (kebab-case).`);
  }

  const isTool = org === '@tools';
  const destination = isTool ? `tools/${name}` : `packages/${name}`;

  const common = path.join(__dirname, `files/common`);
  const source = path.join(__dirname, `files/${type}`);
  const variables = getCommonVariables(name);

  const data = { ...variables, destination, org, orgName, source, type };
  if (interactive) {
    await getConfigConfirmation(data);
  }

  generateFiles(tree, common, destination, data);
  generateFiles(tree, source, destination, data);

  // Wire the new package into the root package.json as a workspace dependency.
  // pnpm-workspace.yaml already globs packages/* and tools/*, so this entry plus
  // the install task below registers the package across the workspace.
  addDependenciesToPackageJson(tree, { [`${org}/${name}`]: 'workspace:^' }, {});

  await formatFiles(tree);

  logger.info(`\n✅ Package generated!\n`);

  // Returned callbacks run AFTER Nx flushes the Tree to disk: install so the new
  // workspace dependency resolves, then `nx sync` the package into the root
  // solution tsconfig's project references (and assert it actually landed).
  return runTasksInSerial(
    () => {
      installPackagesTask(tree);
    },
    () => {
      syncProjectReferences(tree.root, destination);
    },
  );
}

/**
 * Wire a freshly generated package into the root solution tsconfig's project
 * references, then PROVE it landed.
 *
 * `pnpm nx sync` works here because `@nx/js:typescript-sync` is registered as a
 * `sync.globalGenerators` entry in `nx.json`. It is still disabled as a *task*
 * sync generator, which is what keeps it from hard-failing non-TTY shells — see
 * docs/monorepo/NX.md.
 *
 * The post-condition assertion below is kept deliberately: a scaffold that
 * silently fails to register its own project reference is the exact regression
 * this function exists to prevent, whatever the mechanism.
 *
 * Exported for `generator.reference-sync.test.ts`, which covers both the wired
 * and the not-wired paths.
 */
export const syncProjectReferences = (
  root: string,
  destination: string,
): void => {
  execSync('pnpm nx sync', { cwd: root, stdio: 'inherit' });

  const expected = `./${destination}`;
  const tsconfigPath = path.join(root, 'tsconfig.json');
  const references: unknown = JSON.parse(
    readFileSync(tsconfigPath, 'utf8'),
  )?.references;

  const paths = Array.isArray(references)
    ? references.flatMap((reference) =>
        typeof reference === 'object' &&
        reference !== null &&
        'path' in reference &&
        typeof reference.path === 'string'
          ? [reference.path]
          : [],
      )
    : [];

  if (!paths.includes(expected)) {
    throwGeneratorError({
      code: 'PROJECT_REFERENCE_NOT_WIRED',
      field: 'destination',
      hint:
        `Run \`pnpm nx sync\` and inspect the diff, then add "${expected}" to the ` +
        `root tsconfig.json "references" by hand if it is still absent. ` +
        `\`pnpm nx sync:check\` reports project-reference drift without changing files.`,
      message:
        `The package was generated at ${destination}, but the root tsconfig.json ` +
        `still has no project reference to "${expected}". TypeScript will not ` +
        `build it as part of the solution.`,
    });
  }

  logger.info(
    `\n\u2705 Wired "${expected}" into the root tsconfig project references.\n`,
  );
};

type PackageType = 'nestjs' | 'node' | 'react' | 'tools';
const PACKAGE_TYPES: PackageType[] = ['nestjs', 'node', 'react', 'tools'];

export const getPackageType = async (): Promise<PackageType> => {
  const { type } = await prompts({
    choices: [
      { title: 'nestjs', value: 'nestjs' },
      { title: 'nodejs', value: 'node' },
      { title: 'react', value: 'react' },
      { title: 'tool', value: 'tools' },
    ],
    message: 'Package type?',
    name: 'type',
    type: 'select',
  });

  const isValidType = PACKAGE_TYPES.includes(type);
  if (!isValidType) throw new Error('No type provided');

  return type;
};

export default packageGenerator;
