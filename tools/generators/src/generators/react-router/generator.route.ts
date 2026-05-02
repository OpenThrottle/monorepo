import { join } from 'path';
import prompts from 'prompts';
import type { Tree } from '@nx/devkit';
import { formatFiles, generateFiles, logger } from '@nx/devkit';
import { getCommonVariables } from '../../utils/index';
import {
  getTargetApplication,
  parsePossibleNames,
} from '../../utils/questions';

export interface ReactRouterRouteGeneratorSchema {
  readonly application?: string;
  readonly interactive?: boolean;
  readonly name?: string;
}

export const generatorReactRouterRoute = async (
  tree: Tree,
  schema: ReactRouterRouteGeneratorSchema,
): Promise<void> => {
  const interactive = schema.interactive === true;

  const application =
    schema.application ??
    (interactive ? await getTargetApplication() : undefined);

  if (!application) {
    throw new Error(
      `Missing required option: "application". Re-run with --interactive or pass --application=<app>.`,
    );
  }

  const nameString =
    schema.name ?? (interactive ? await getRouteName() : undefined);

  if (!nameString) {
    throw new Error(
      `Missing required option: "name". Re-run with --interactive or pass --name=<route[,moreRoutes]>.`,
    );
  }

  const names = parsePossibleNames(nameString);
  const errors: string[] = [];
  names.forEach((value: string) => {
    if (value.length < 3) {
      errors.push(`Must be at least 3 characters: ${value}`);
    }
  });
  if (errors.length > 0) throw new Error(errors.join('\n'));

  names.forEach((name: string) => {
    const isApiRoute = name.startsWith('api.');
    const destination = join('applications', application, 'app/routes');
    const template = isApiRoute ? 'route-api' : 'route';
    const templates = join(__dirname, 'files', template);
    const variables = getCommonVariables(name);

    generateFiles(tree, templates, destination, variables);
  });

  await formatFiles(tree);

  logger.info(`\n✅ Route(s) generated!\n`);
};

const getRouteName = async () => {
  const { name } = await prompts({
    message: 'What route(s) are we creating?',
    name: 'name',
    type: 'text',
    validate: (value) => {
      const values = parsePossibleNames(value);
      const errors: string[] = [];

      values.forEach((value: string) => {
        if (value.length < 3) {
          errors.push(`Must be at least 3 characters: ${value}`);
        }
      });

      if (errors.length > 0) {
        return errors.join('\n');
      }

      return true;
    },
  });

  if (!name) throw new Error('No application selected');

  return name;
};
