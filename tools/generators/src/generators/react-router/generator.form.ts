import { join } from 'path';
import type { Tree } from '@nx/devkit';
import { formatFiles, logger } from '@nx/devkit';
import prompts from 'prompts';
import { camelCase } from 'lodash';
import {
  getCommonVariables,
  getRemixRoutingFolders,
  getRemixServiceFolders,
} from '../../utils';
import {
  getTargetApplication,
  parsePossibleNames,
} from '../../utils/questions';
import { MESSAGE_ON_CANCEL } from '../../utils/messages';
import { throwInvalidFolderError } from '../../utils/target-validation';
import { generateFilesSafely } from '../../utils/generate-files-safely';

export interface ReactRouterFormGeneratorSchema {
  readonly application?: string;
  readonly folder?: string;
  readonly interactive?: boolean;
  readonly name?: string;
}

export const generatorReactRouterForm = async (
  tree: Tree,
  schema: ReactRouterFormGeneratorSchema,
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

  const choicesGlobal = ['global'].map((_name) => ({
    title: `global/components`,
    value: `global/components`,
  }));

  const choicesRouting = foldersRouting.map((name) => ({
    title: `routing/${name}/components`,
    value: `routing/${name}/components`,
  }));

  const choicesServices = foldersServices.map((name) => ({
    title: `services/${name}/components`,
    value: `services/${name}/components`,
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
      listKey: 'formFolders',
    });
  }

  const nameString =
    schema.name ?? (interactive ? await getFormNames() : undefined);

  if (!nameString) {
    throw new Error(
      `Missing required option: "name". Re-run with --interactive or pass --name=<NameForm[,MoreForms]>.`,
    );
  }

  const names = parsePossibleNames(nameString);
  const errors: string[] = [];
  names.forEach((value: string) => {
    if (value.length < 3) {
      errors.push(`Must be at least 3 characters: ${value}`);
    }
    if (!value.endsWith('Form')) {
      errors.push(`Must end with the "Form" suffix: ${value}`);
    }
  });
  if (errors.length > 0) throw new Error(errors.join('\n'));

  names.forEach((name: string) => {
    const variables = getCommonVariables(name);
    const directory = folder.replace('/components', '');

    const destination = join('applications', application, 'app', directory);
    const templates = join(__dirname, 'files/form');
    const options = {
      ...variables,
      directory,
      schema: camelCase(name).replace('Form', ''),
    };

    generateFilesSafely(tree, templates, destination, options);
  });

  await formatFiles(tree);

  logger.info(`\n✅ Form(s) generated!\n`);
};

const getFormNames = async () => {
  const { name } = await prompts({
    message: 'Form name(s)?',
    name: 'name',
    type: 'text',
    validate: (value: string) => {
      const values = parsePossibleNames(value);
      const errors: string[] = [];

      values.forEach((value: string) => {
        const endsWithForm = value.endsWith('Form');

        if (value.length < 3) {
          errors.push(`Must be at least 3 characters: ${value}`);
        }

        if (!endsWithForm) {
          errors.push(`Must end with the "Form" suffix: ${value}`);
        }
      });

      if (errors.length > 0) {
        return errors.join('\n');
      }

      return true;
    },
  });

  if (!name) throw new Error(MESSAGE_ON_CANCEL);

  return name;
};
