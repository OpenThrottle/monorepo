import { join } from 'path';
import type { Tree } from '@nx/devkit';
import { createProjectGraphAsync, formatFiles, logger } from '@nx/devkit';
import prompts from 'prompts';
import { getCommonVariables, getGeneratorOverview } from '../../utils';
import {
  getConfigConfirmation,
  getReactHookDestination,
  parsePossibleNames,
} from '../../utils/questions';
import { validateCamelCase } from '../../utils/validation';
import { throwInvalidDestinationError } from '../../utils/target-validation';
import { generateFilesSafely } from '../../utils/generate-files-safely';

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
  const project = destination
    ? (await createProjectGraphAsync()).nodes[destination]
    : interactive
      ? await getReactHookDestination()
      : undefined;

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

  for await (const name of names) {
    const destination = join(project.data.root, 'src/utils');
    const templates = join(__dirname, 'files/util');
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
