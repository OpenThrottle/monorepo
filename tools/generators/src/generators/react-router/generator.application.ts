import { join } from 'path';
import type { Tree } from '@nx/devkit';
import { formatFiles, generateFiles, logger } from '@nx/devkit';
import prompts from 'prompts';
import { getCommonVariables } from '../../utils/index';
import { REGEX_SLUG } from '../../utils/regex';

export interface ReactRouterApplicationGeneratorSchema {
  readonly interactive?: boolean;
  readonly name?: string;
  /** Dev-server port baked into the generated .env; existing apps use 60xx. */
  readonly port?: number;
}

export const generatorReactRouterApplication = async (
  tree: Tree,
  schema: ReactRouterApplicationGeneratorSchema,
): Promise<void> => {
  const interactive = schema.interactive === true;

  const name =
    schema.name ??
    (interactive
      ? (
          await prompts({
            message: 'What would you like to name this application?',
            name: 'name',
            type: 'text',
            validate: (value: string) => {
              if (value.length < 3) return 'Must be at least 3 characters';
              if (!REGEX_SLUG.test(value)) return 'Must be a slug (kebab-case)';
              return true;
            },
          })
        ).name
      : undefined);

  if (!name) throw new Error('Application name is required.');
  if (name.length < 3) {
    throw new Error('Application name must be at least 3 characters.');
  }
  if (!REGEX_SLUG.test(name)) {
    throw new Error('Application name must be a slug (kebab-case).');
  }

  const destination = join('applications', name);
  const templates = join(__dirname, 'files/application');
  const variables = {
    ...getCommonVariables(name),
    port: schema.port ?? 6000,
  };

  // addProjectConfiguration(tree, options.name, {
  //   root: projectRoot,
  //   projectType: 'library',
  //   sourceRoot: `${projectRoot}/src`,
  //   targets: {},
  // });

  generateFiles(tree, templates, destination, variables);

  await formatFiles(tree);

  logger.info(`\n✅ Application generated!\n`);
};
