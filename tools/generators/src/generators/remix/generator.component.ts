import { join } from 'path';
import type { Tree } from '@nx/devkit';
import { formatFiles, generateFiles, logger } from '@nx/devkit';
import prompts from 'prompts';
import {
  getCommonVariables,
  getRemixRoutingFolders,
  getRemixServiceFolders,
} from '../../utils';
import {
  getComponentNames,
  getTargetApplication,
  parsePossibleNames,
} from '../../utils/questions';
import { REGEX_PASCAL_CASE_V2 } from '../../utils/regex';

export interface RemixComponentGeneratorSchema {
  readonly application?: string;
  readonly folder?: string;
  readonly interactive?: boolean;
  readonly name?: string;
}

export const generatorRemixComponent = async (
  tree: Tree,
  schema: RemixComponentGeneratorSchema,
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
    throw new Error(
      `Invalid folder "${folder}". Use --list=componentFolders with --application=${application} to enumerate valid values.`,
    );
  }

  const nameString =
    schema.name ?? (interactive ? await getComponentNames() : undefined);

  if (!nameString) {
    throw new Error(
      `Missing required option: "name". Re-run with --interactive or pass --name=<PascalCase[,MoreNames]>.`,
    );
  }

  const names = parsePossibleNames(nameString);
  const errors: string[] = [];
  names.forEach((value) => {
    if (value.length < 3) {
      errors.push(`Must be at least 3 characters: ${value}`);
    }

    if (!REGEX_PASCAL_CASE_V2.test(value)) {
      errors.push(`Must be pascal case: ${value}`);
    }
  });
  if (errors.length > 0) throw new Error(errors.join('\n'));

  names.forEach((name: string) => {
    const variables = getCommonVariables(name);
    const destination = join('applications', application, 'app', folder);
    const templates = join(__dirname, 'files/component');

    generateFiles(tree, templates, destination, variables);
  });

  await formatFiles(tree);

  logger.info(`\n✅ Component(s) generated!\n`);
};
