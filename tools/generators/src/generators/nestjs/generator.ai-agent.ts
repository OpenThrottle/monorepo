import { join } from 'path';
import type { Tree } from '@nx/devkit';
import { formatFiles, generateFiles, logger } from '@nx/devkit';
import { getCommonVariables } from '../../utils/index';
import { getNestJSApplication } from '../../utils/projects';
import { getTargetName } from '../../utils/questions';
import { REGEX_SLUG } from '../../utils/regex';

export interface NestJSAIAgentGeneratorSchema {
  readonly application?: string;
  readonly interactive?: boolean;
  readonly name?: string;
}

export const generatorNestJSAIAgent = async (
  tree: Tree,
  schema: NestJSAIAgentGeneratorSchema,
): Promise<void> => {
  const interactive = schema.interactive === true;

  // 💬 Collect the user inputs we need to "generate" our code
  const application =
    schema.application ??
    (interactive ? await getNestJSApplication() : undefined);

  if (!application) {
    throw new Error(
      `Missing required option: "application". Re-run with --interactive or pass --application=<nestjs-app>.`,
    );
  }

  const name =
    schema.name ??
    (interactive
      ? await getTargetName('What would you like to name the module?')
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

  // 📂 Define the source and destination paths
  const source = join(__dirname, `files/ai-agent`);
  const destination = `applications/${application}/src/agents/`;
  const options = { ...getCommonVariables(name), application, name };

  // 📂 Copy "files" into the destination with template support
  generateFiles(tree, source, destination, options);

  // 🪣 Clean things up if we can
  await formatFiles(tree);

  // ✅ Success
  const message = `\n✅ NestJS AI Agent "${name}" created in "${application}"!\n`;
  logger.info(message);
};
