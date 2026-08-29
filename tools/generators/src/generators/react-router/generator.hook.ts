import { join } from 'path';
import type { Tree } from '@nx/devkit';
import { formatFiles, logger } from '@nx/devkit';
import prompts from 'prompts';
import {
  getCommonVariables,
  getRemixRoutingFolders,
  getRemixServiceFolders,
} from '../../utils';
import {
  getTargetApplication,
  parsePossibleNames,
} from '../../utils/questions';
import { validateCamelCase } from '../../utils/validation';
import { throwInvalidFolderError } from '../../utils/target-validation';
import { generateFilesSafely } from '../../utils/generate-files-safely';

export interface ReactRouterHookGeneratorSchema {
  readonly application?: string;
  readonly folder?: string;
  readonly interactive?: boolean;
  readonly name?: string;
}

/**
 * @description Scaffold React Router app hooks under `app/<area>/hooks/`.
 * `--folder` uses area paths (same discovery sources as component):
 * `global`, `routing/<name>`, `services/<name>` → destination `app/<folder>/hooks/`.
 */
export const generatorReactRouterHook = async (
  tree: Tree,
  schema: ReactRouterHookGeneratorSchema,
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

  const foldersRouting = getRemixRoutingFolders(application);
  const foldersServices = getRemixServiceFolders(application);

  const choicesGlobal = [
    {
      title: `global/hooks`,
      value: `global`,
    },
  ];

  const choicesRouting = foldersRouting.map((name) => ({
    title: `routing/${name}/hooks`,
    value: `routing/${name}`,
  }));

  const choicesServices = foldersServices.map((name) => ({
    title: `services/${name}/hooks`,
    value: `services/${name}`,
  }));

  const allowedFolders = [
    ...choicesGlobal.map((c) => c.value),
    ...choicesRouting.map((c) => c.value),
    ...choicesServices.map((c) => c.value),
  ];

  const folder =
    schema.folder ??
    (interactive
      ? (
          await prompts({
            choices: [...choicesGlobal, ...choicesRouting, ...choicesServices],
            message: 'Please select the destination folder.',
            name: 'folder',
            type: 'select',
          })
        ).folder
      : undefined);

  if (!folder) throw new Error('No folder selected');
  if (!allowedFolders.includes(folder)) {
    throwInvalidFolderError({
      application,
      folder,
      listKey: 'hookFolders',
      suffix:
        'Values are area paths (e.g. global, routing/<area>, services/<area>).',
    });
  }

  const nameString =
    schema.name ?? (interactive ? await getHookNames() : undefined);

  if (!nameString) {
    throw new Error(
      `Missing required option: "name". Re-run with --interactive or pass --name=<camelCase[,moreNames]>.`,
    );
  }

  const names = parsePossibleNames(nameString);
  const errors: string[] = [];
  names.forEach((value) => {
    const error = validateCamelCase(value);
    if (error) errors.push(`${error}: ${value}`);
  });
  if (errors.length > 0) throw new Error(errors.join('\n'));

  names.forEach((name: string) => {
    const variables = getCommonVariables(name);
    const destination = join(
      'applications',
      application,
      'app',
      folder,
      'hooks',
    );
    const templates = join(__dirname, 'files/hook');

    generateFilesSafely(tree, templates, destination, variables);
  });

  await formatFiles(tree);

  logger.info(`\n✅ Hook(s) generated!\n`);
};

/**
 * @description Prompt for one or more camelCase hook names (comma-separated).
 */
export const getHookNames = async (): Promise<string> => {
  const { name } = await prompts({
    message: 'Hook name(s)?',
    name: 'name',
    type: 'text',
    validate: (value) => {
      const values = parsePossibleNames(value);
      const errors: string[] = [];

      values.forEach((value: string) => {
        const error = validateCamelCase(value);
        if (error) errors.push(`${error}: ${value}`);
      });

      if (errors.length > 0) {
        return errors.join('\n');
      }

      return true;
    },
  });

  if (!name) throw new Error('No name provided');

  return name;
};
