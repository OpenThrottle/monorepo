import { join } from 'path';
import prompts from 'prompts';
import type { Tree } from '@nx/devkit';
import { formatFiles, generateFiles, logger } from '@nx/devkit';
import { getCommonVariables, getRemixRoutingFolders } from '../../utils';
import {
  getTargetApplication,
  parsePossibleNames,
} from '../../utils/questions';
import { REGEX_PASCAL_CASE } from '../../utils/regex';

export interface ReactRouterModalGeneratorSchema {
  readonly application?: string;
  readonly folder?: string;
  readonly interactive?: boolean;
  readonly name?: string;
}

export const generatorReactRouterModal = async (
  tree: Tree,
  schema: ReactRouterModalGeneratorSchema,
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

  const choicesGlobal = ['global'].map((_name) => ({
    title: `global/components`,
    value: `global/components`,
  }));

  const choicesRouting = foldersRouting.map((name) => ({
    title: `routing/${name}/components`,
    value: `routing/${name}/components`,
  }));

  // const choicesServices = foldersServices.map((name) => ({
  //   title: `services/${name}/components`,
  //   value: `services/${name}/components`,
  // }));

  const allowedFolders = [
    ...choicesGlobal.map((c) => c.value),
    ...choicesRouting.map((c) => c.value),
  ];

  const folder =
    schema.folder ??
    (interactive
      ? (
          await prompts({
            choices: [...choicesGlobal, ...choicesRouting],
            // choices: [...choicesGlobal, ...choicesRouting, ...choicesServices],
            message: 'Please select the destination folder.',
            name: 'folder',
            type: 'select',
          })
        ).folder
      : undefined);

  if (!folder) throw new Error('No folder selected');
  if (!allowedFolders.includes(folder)) {
    throw new Error(
      `Invalid folder "${folder}". Use --list=modalFolders with --application=${application} to enumerate valid values.`,
    );
  }

  const nameString =
    schema.name ?? (interactive ? await getModalNames() : undefined);

  if (!nameString) {
    throw new Error(
      `Missing required option: "name". Re-run with --interactive or pass --name=<NameModal[,MoreModals]>.`,
    );
  }

  const names = parsePossibleNames(nameString);
  const errors: string[] = [];
  names.forEach((value: string) => {
    if (value.length < 3) {
      errors.push(`Must be at least 3 characters: ${value}`);
    }
    if (!value.endsWith('Modal')) {
      errors.push(`Must end with "Modal": ${value}`);
    }
    if (!REGEX_PASCAL_CASE.test(value)) {
      errors.push(`Must be pascal case: ${value}`);
    }
  });
  if (errors.length > 0) throw new Error(errors.join('\n'));

  names.forEach((name) => {
    const variables = getCommonVariables(name);

    const destination = join('applications', application, 'app', folder);
    const templates = join(__dirname, 'files/modal');

    generateFiles(tree, templates, destination, variables);
  });

  await formatFiles(tree);

  logger.info(`\n✅ Modal generated!\n`);
};

export const getModalNames = async () => {
  const { name } = await prompts({
    message: 'Modal name(s)?',
    name: 'name',
    type: 'text',
    validate: (value) => {
      const values = parsePossibleNames(value);
      const errors: string[] = [];

      values.forEach((value: string) => {
        if (value.length < 3) {
          errors.push('Please at least 3 characters');
        }

        if (!value.endsWith('Modal')) {
          errors.push('Must end with "Modal"');
        }

        if (!REGEX_PASCAL_CASE.test(value)) {
          errors.push('Must be pascal case');
        }
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
