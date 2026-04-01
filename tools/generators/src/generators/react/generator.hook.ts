import { join } from 'path';
import type { Tree } from '@nx/devkit';
import {
  createProjectGraphAsync,
  formatFiles,
  generateFiles,
  logger,
} from '@nx/devkit';
import prompts from 'prompts';
import { getCommonVariables, getGeneratorOverview } from '../../utils';
import {
  getConfigConfirmation,
  getReactHookDestination,
  parsePossibleNames,
} from '../../utils/questions';
import { validateCamelCase } from '../../utils/validation';

export interface ReactHookGeneratorSchema {
  readonly destination?: string;
  readonly interactive?: boolean;
  readonly name?: string;
}

export async function hookGenerator(
  tree: Tree,
  schema: ReactHookGeneratorSchema,
): Promise<void> {
  const interactive = schema.interactive === true;

  if (interactive) {
    const overview = `This generator will create a new "hook" in the selected package/app.`;
    await getGeneratorOverview('React Hook', overview);
  }

  const destination = schema.destination;
  const project = destination
    ? (await createProjectGraphAsync()).nodes[destination]
    : interactive
      ? await getReactHookDestination()
      : undefined;

  if (!project) {
    throw new Error(
      destination
        ? `Invalid destination "${destination}". Use --list=destinations to enumerate valid values.`
        : `Missing required option: "destination". Re-run with --interactive or pass --destination=<nx-project>.`,
    );
  }

  const nameString =
    schema.name ?? (interactive ? await getHookNames() : undefined);

  if (!nameString) {
    throw new Error(
      `Missing required option: "name". Re-run with --interactive or pass --name=<camelCase[,moreNames]>.`,
    );
  }

  const names = parsePossibleNames(nameString);

  for await (const name of names) {
    const destination = join(project.data.root, 'src/hooks');
    const templates = join(__dirname, 'files/hook');
    const variables = getCommonVariables(name);

    const data = { ...variables, destination, name, templates };
    if (interactive) {
      await getConfigConfirmation(data);
    }

    generateFiles(tree, templates, destination, data);
  }

  await formatFiles(tree);

  logger.info(`\n✅ Hook generated!\n`);
}

export const getHookNames = async () => {
  const { name } = await prompts({
    message: 'Component name(s)?',
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
