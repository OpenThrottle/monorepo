import { join } from 'path';
import type { Tree } from '@nx/devkit';
import { formatFiles, generateFiles, logger } from '@nx/devkit';
import { getTargetName, getTargetPort } from '../../utils/questions';
import { onApplicationSuccess } from '../../utils/messages';
import { getGithubUsername } from '../../utils';
import { REGEX_SLUG } from '../../utils/regex';

export interface NestJSApplicationGeneratorSchema {
  readonly interactive?: boolean;
  readonly name?: string;
  readonly port?: number;
  readonly username?: string;
}

export const generatorNestJSApplication = async (
  tree: Tree,
  schema: NestJSApplicationGeneratorSchema,
): Promise<void> => {
  const interactive = schema.interactive === true;

  // 💬 Collect the user inputs we need to "generate" our code
  const name =
    schema.name ??
    (interactive
      ? await getTargetName('What would you like to name the app?')
      : undefined);

  if (!name) {
    throw new Error(
      `Missing required option: "name". Re-run with --interactive or pass --name=<slug>.`,
    );
  }

  if (name.length < 3) throw new Error(`Name must be at least 3 characters.`);
  if (!REGEX_SLUG.test(name)) {
    throw new Error(`Name must be a slug (kebab-case).`);
  }

  const port = schema.port ?? (interactive ? await getTargetPort() : undefined);

  if (!port) {
    throw new Error(
      `Missing required option: "port". Re-run with --interactive or pass --port=<4000-9999>.`,
    );
  }

  if (port < 4000 || port > 9999) {
    throw new Error(`Port number must be between 4000 and 9999.`);
  }

  const username = schema.username ?? getGithubUsername();

  // 📂 Define the source and destination paths
  const source = join(__dirname, `files/application`);
  const destination = `applications/${name}`;
  const options = { name, port, username };

  // 📂 Copy "files" into the destination with template support
  generateFiles(tree, source, destination, options);

  // 🪣 Clean things up if we can
  await formatFiles(tree);

  // ✅ Success
  const message = onApplicationSuccess(name);
  logger.info(message);
};
