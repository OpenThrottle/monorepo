import { join } from 'path';
import type { Tree } from '@nx/devkit';
import { createProjectGraphAsync, formatFiles, logger } from '@nx/devkit';
import { getCommonVariables, getGeneratorOverview } from '../../utils';
import {
  getComponentNames,
  getConfigConfirmation,
  getReactComponentDestination,
  parsePossibleNames,
} from '../../utils/questions';
import { throwInvalidDestinationError } from '../../utils/target-validation';
import { generateFilesSafely } from '../../utils/generate-files-safely';

export interface ReactComponentGeneratorSchema {
  readonly destination?: string;
  readonly interactive?: boolean;
  readonly name?: string;
}

export async function componentGenerator(
  tree: Tree,
  schema: ReactComponentGeneratorSchema,
): Promise<void> {
  const interactive = schema.interactive === true;

  if (interactive) {
    const overview = `This generator will create a new "component" in the selected package.`;
    await getGeneratorOverview('React Component', overview);
  }

  const destination = schema.destination;

  const project = destination
    ? (await createProjectGraphAsync()).nodes[destination]
    : interactive
      ? await getReactComponentDestination()
      : undefined;

  if (!project) {
    if (destination) await throwInvalidDestinationError(destination);

    throw new Error(
      `Missing required option: "destination". Re-run with --interactive or pass --destination=<nx-project>.`,
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

  for await (const name of names) {
    const destination = join(project.data.root, 'src/components');
    const templates = join(__dirname, 'files/component');
    const variables = getCommonVariables(name);

    const data = { ...variables, destination, name, templates };
    if (interactive) {
      await getConfigConfirmation(data);
    }

    generateFilesSafely(tree, templates, destination, data);
  }

  await formatFiles(tree);

  logger.info(`\n✅ Component generated!\n`);
}
