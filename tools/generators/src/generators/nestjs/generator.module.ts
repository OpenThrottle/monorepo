import { join } from 'path';
import type { Tree } from '@nx/devkit';
import {
  createProjectGraphAsync,
  formatFiles,
  generateFiles,
  logger,
} from '@nx/devkit';
import { getCommonVariables } from '../../utils/index';
import { getNestJSApplication } from '../../utils/projects';
import { getTargetName } from '../../utils/questions';
import { REGEX_SLUG } from '../../utils/regex';

export interface NestJSModuleGeneratorSchema {
  readonly application?: string;
  readonly destination?: string;
  readonly interactive?: boolean;
  readonly name?: string;
}

/**
 * @description Resolves destination directory for modules: either applications/<app>/src/modules/ or <project.root>/src/modules/ when destination (NestJS package) is set.
 */
function resolveModulesDestination(
  application: string | undefined,
  destinationProject: string | undefined,
): string {
  if (destinationProject) {
    return join(destinationProject, 'src/modules/');
  }
  if (application) {
    return `applications/${application}/src/modules/`;
  }
  throw new Error(
    'Missing required option: "application" or "destination". Re-run with --interactive or pass --application=<nestjs-app> or --destination=<nestjs-package>.',
  );
}

export const generatorNestJSModule = async (
  tree: Tree,
  schema: NestJSModuleGeneratorSchema,
): Promise<void> => {
  const interactive = schema.interactive === true;

  let application = schema.application;
  let destinationProject: string | undefined;

  if (schema.destination) {
    const graph = await createProjectGraphAsync();
    const node = graph.nodes[schema.destination];
    if (!node?.data?.root) {
      throw new Error(
        `Invalid destination "${schema.destination}". Use --list=nestjsPackages to enumerate valid NestJS package targets.`,
      );
    }
    destinationProject = node.data.root;
  } else {
    application =
      schema.application ??
      (interactive ? await getNestJSApplication() : undefined);
  }

  const destinationPath = resolveModulesDestination(
    application,
    destinationProject,
  );

  const name =
    schema.name ??
    (interactive
      ? await getTargetName('What would you like to name the module?')
      : undefined);

  if (!name) {
    throw new Error(
      `Missing required option: "name". Re-run with --interactive or pass --name=<slug>.`,
    );
  }

  if (name.length < 3) throw new Error(`Name must be at least 3 characters.`);
  if (!REGEX_SLUG.test(name)) {
    throw new Error(`Name must be a slug (kebab-case).`);
  }

  const displayTarget =
    schema.destination ?? application ?? destinationProject ?? 'unknown';
  const options = {
    ...getCommonVariables(name),
    application: displayTarget,
    name,
  };

  const source = join(__dirname, `files/module`);
  generateFiles(tree, source, destinationPath, options);

  await formatFiles(tree);

  const message = `\n✅ NestJS module "${name}" created in "${displayTarget}"!\n`;
  logger.info(message);
};
