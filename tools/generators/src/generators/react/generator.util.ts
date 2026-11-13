import type { Tree } from '@nx/devkit';
import { formatFiles, logger } from '@nx/devkit';
import { join } from 'path';
import prompts from 'prompts';

import { generateFilesSafely } from '../../utils/generateFilesSafely.ts';
import { getCommonVariables, getGeneratorOverview } from '../../utils/index.ts';
import { resolveReactDestination } from '../../utils/interactive.ts';
import {
  getConfigConfirmation,
  getReactHookDestination,
  parsePossibleNames,
} from '../../utils/questions.ts';
import { throwInvalidDestinationError } from '../../utils/target-validation.ts';
import { validateCamelCase } from '../../utils/validation.ts';

export interface ReactUtilGeneratorSchema {
  readonly destination?: string;
  readonly interactive?: boolean;
  readonly name?: string;
}

export async function utilGenerator(
  tree: Tree,
  schema: ReactUtilGeneratorSchema,
): Promise<void> {
  const interactive = schema.interactive === true;

  if (interactive) {
    const overview = `This generator will create a new "util" in the selected package/app.`;
    await getGeneratorOverview('React Util', overview);
  }

  const destination = schema.destination;
  const project = await resolveReactDestination(
    destination,
    interactive,
    getReactHookDestination,
  );

  if (!project) {
    if (destination) await throwInvalidDestinationError(destination);

    throw new Error(
      `Missing required option: "destination". Re-run with --interactive or pass --destination=<nx-project>.`,
    );
  }

  const nameString =
    schema.name ?? (interactive ? await getUtilNames() : undefined);
  if (!nameString) {
    throw new Error(
      `Missing required option: "name". Re-run with --interactive or pass --name=<camelCase[,moreNames]>.`,
    );
  }

  const names = parsePossibleNames(nameString);

  // The name is both the exported identifier and the file name
  // (`moveListItem` → `moveListItem.ts`), so anything but camelCase would
  // emit an unparseable `export const move-list-item`.
  const invalidNames = names.flatMap((name: string) => {
    const error = validateCamelCase(name);

    return error ? [`${error}: ${name}`] : [];
  });

  if (invalidNames.length > 0) {
    throw new Error(
      `Invalid util name(s) — pass camelCase, e.g. --name=moveListItem:\n${invalidNames.join('\n')}`,
    );
  }

  for await (const name of names) {
    const destination = join(project.data.root, 'src/utils');
    const templates = join(import.meta.dirname, 'files/util');
    const variables = getCommonVariables(name);

    const data = { ...variables, destination, name, templates };
    if (interactive) {
      await getConfigConfirmation(data);
    }

    generateFilesSafely(tree, templates, destination, data);
  }

  await formatFiles(tree);

  logger.info(`\n✅ Util generated!\n`);
}

export const getUtilNames = async () => {
  const { name } = await prompts({
    initial: 'index',
    message: 'Utility filename(s)?',
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
