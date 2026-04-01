import { join } from 'path';
import prompts from 'prompts';
import type { Tree } from '@nx/devkit';
import { formatFiles, generateFiles, logger } from '@nx/devkit';
import { getCommonVariables } from '../../utils/index';
import { getGraphQLApplications } from '../../utils/projects';
import { REGEX_SLUG } from '../../utils/regex';

export interface NestJSGraphQLServiceGeneratorSchema {
  readonly application?: string;
  readonly interactive?: boolean;
  readonly name?: string;
}

export const generatorNestJSGraphQLService = async (
  tree: Tree,
  schema: NestJSGraphQLServiceGeneratorSchema,
): Promise<void> => {
  const interactive = schema.interactive === true;

  // 💬 Collect the user inputs we need to "generate" our code
  const application =
    schema.application ??
    (interactive ? await getGraphQLApplications() : undefined);

  if (!application) {
    throw new Error(
      `Missing required option: "application". Re-run with --interactive or pass --application=<graphql-app>.`,
    );
  }

  const name =
    schema.name ??
    (interactive
      ? (
          await prompts({
            message: 'What is the service name?',
            name: 'name',
            type: 'text',
            validate: (value: string) => {
              if (value.length < 3) return `Name must be at least 3 characters`;
              if (!REGEX_SLUG.test(value)) return `Name must be a valid slug`;

              return true;
            },
          })
        ).name
      : undefined);

  if (!name) {
    throw new Error(
      `Missing required option: "name". Re-run with --interactive or pass --name=<slug>.`,
    );
  }

  if (name.length < 3) throw new Error(`Name must be at least 3 characters.`);
  if (!REGEX_SLUG.test(name)) throw new Error(`Name must be a valid slug.`);

  // 📂 Define the source and destination paths
  const source = join(__dirname, `files/graphql-service`);
  const destination = `applications/${application}/src/services/`;
  const options = { ...getCommonVariables(name), application, name };

  // 📂 Copy "files" into the destination with template support
  generateFiles(tree, source, destination, options);

  // 🪣 Clean things up if we can
  await formatFiles(tree);

  // ✅ Success
  const message = `\n✅ GraphQL service "${name}" created in "${application}"!\n`;
  logger.info(message);
};
