import type { Tree } from '@nx/devkit';
import { formatFiles, generateFiles, logger } from '@nx/devkit';
import { join } from 'path';
import prompts from 'prompts';

import {
  assertFolderVocabulary,
  describeBannedFolder,
  FOLDER_VOCABULARY_RESTRICTION,
  isBannedFolderName,
} from '../../utils/folder-vocabulary.ts';
import {
  getCommonVariables,
  getMonorepoApplications,
} from '../../utils/index.ts';
import {
  askWhenInteractive,
  isInteractiveArgPresent,
  writeJsonToStdout,
} from '../../utils/interactive.ts';
import {
  getConfigConfirmation,
  getTargetApplication,
} from '../../utils/questions.ts';
import { throwGeneratorError } from '../../utils/target-validation.ts';
import { REGEX_SLUG } from '../../utils/validation.ts';

export interface FoldersGeneratorSchema {
  readonly application?: string;
  readonly describe?: boolean;
  readonly folder?: 'routing' | 'services';
  readonly interactive?: boolean;
  readonly list?: string;
  readonly name?: string;
}

export async function foldersGenerator(
  tree: Tree,
  schema: FoldersGeneratorSchema,
): Promise<void> {
  const interactive = schema.interactive === true || isInteractiveArgPresent();

  if (schema.describe === true) {
    writeJsonToStdout({
      id: '@tools/generators:folders',
      list: {
        applications: {
          description: `Monorepo applications (Nx projects tagged type:application).`,
          source: { tags: ['type:application'], type: 'projectGraphTags' },
        },
        folders: {
          description: 'Static choices for folder area.',
          values: ['routing', 'services'],
        },
      },
      options: {
        application: { dynamic: true, required: true, type: 'string' },
        folder: {
          enum: ['routing', 'services'],
          required: true,
          type: 'string',
        },
        name: {
          description: FOLDER_VOCABULARY_RESTRICTION,
          pattern: 'slug',
          required: true,
          type: 'string',
        },
      },
    });

    return;
  }

  if (schema.list) {
    const listKey = schema.list;

    if (listKey === 'applications') {
      writeJsonToStdout(await getMonorepoApplications());
      return;
    }

    if (listKey === 'folders') {
      writeJsonToStdout(['routing', 'services']);
      return;
    }

    throwGeneratorError({
      code: 'unknown_list_key',
      field: 'list',
      message: `Unknown --list value "${listKey}".`,
      validValues: ['applications', 'folders'],
    });
  }

  const application =
    schema.application ??
    (interactive ? await getTargetApplication() : undefined);

  if (!application) {
    throw new Error(
      `Missing required option: "application". Re-run with --interactive or pass --application=<app>.`,
    );
  }

  const folder =
    schema.folder ??
    (await askWhenInteractive(
      interactive,
      async () =>
        (
          await prompts({
            choices: [
              { title: 'routing', value: 'routing' },
              { title: 'services', value: 'services' },
            ],
            message: 'Is this a new "routing" or "service" folder.',
            name: 'folder',
            type: 'select',
          })
        ).folder,
    ));

  if (!folder) {
    throw new Error(
      `Missing required option: "folder". Re-run with --interactive or pass --folder=routing|services.`,
    );
  }

  const name =
    schema.name ??
    (await askWhenInteractive(
      interactive,
      async () =>
        (
          await prompts({
            message: `What is the name of the "${folder}" folder?`,
            name: 'name',
            type: 'text',
            validate: (value) => {
              if (value.length < 3) return 'Must be at least 3 characters';
              if (!REGEX_SLUG.test(value)) return 'Must be a slug (kebab-case)';
              if (isBannedFolderName(value)) return describeBannedFolder(value);
              return true;
            },
          })
        ).name,
    ));

  if (!name) {
    throw new Error(
      `Missing required option: "name". Re-run with --interactive or pass --name=<slug>.`,
    );
  }

  if (name.length < 3) throw new Error(`Name must be at least 3 characters.`);
  if (!REGEX_SLUG.test(name)) {
    throw new Error(`Name must be a slug (lowercase, hyphen-separated).`);
  }
  assertFolderVocabulary('name', name);

  const variables = getCommonVariables(name);
  const destination = join('applications', application, 'app', folder);
  const templates = join(import.meta.dirname, 'files');

  const data = { ...variables, destination, templates };
  if (interactive) {
    await getConfigConfirmation(data);
  }

  generateFiles(tree, templates, destination, data);

  await formatFiles(tree);

  logger.info(`\n✅ Folder generated!\n`);
}

export default foldersGenerator;
