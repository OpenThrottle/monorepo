import prompts from 'prompts';
import type { Tree } from '@nx/devkit';
import { getProjectsByTags } from '../../utils/projects';
import { writeJsonToStdout } from '../../utils/output';
import { throwGeneratorError } from '../../utils/generator-errors';
import { isInteractiveArgPresent } from '../../utils/nx-cli';
import { componentGenerator } from './generator.component';
import { hookGenerator } from './generator.hook';
import { storyGenerator } from './generator.story';
import { utilGenerator } from './generator.util';

export interface ReactGeneratorSchema {
  readonly describe?: boolean;
  readonly destination?: string;
  readonly generator?: 'component' | 'hook' | 'story' | 'util';
  readonly list?: string;
  readonly name?: string;
  readonly subGenerator?: 'component' | 'hook' | 'story' | 'util';
  readonly withPrompts?: boolean;
}

export async function reactGenerator(
  tree: Tree,
  schema: ReactGeneratorSchema = {},
): Promise<void> {
  const interactive = schema.withPrompts === true || isInteractiveArgPresent();

  if (schema.describe === true) {
    writeJsonToStdout({
      id: '@tools/generators:react',
      list: {
        destinations: {
          description: 'Nx projects matching tags: technology:react',
          source: { tags: ['technology:react'], type: 'projectGraphTags' },
        },
        generators: {
          description: 'Available react generator values.',
          values: ['component', 'hook', 'story', 'util'],
        },
      },
      options: {
        destination: { dynamic: true, required: true, type: 'string' },
        name: {
          description: 'Comma-separated names supported.',
          required: true,
          type: 'string',
        },
        subGenerator: {
          enum: ['component', 'hook', 'story', 'util'],
          required: true,
          type: 'string',
        },
      },
    });
    return;
  }

  if (schema.list) {
    const listKey = schema.list;

    if (listKey === 'generators') {
      writeJsonToStdout(['component', 'hook', 'story', 'util']);
      return;
    }

    if (listKey === 'destinations') {
      const projects = await getProjectsByTags(['technology:react']);
      writeJsonToStdout(projects.map((p) => p.name).sort());
      return;
    }

    throwGeneratorError({
      code: 'unknown_list_key',
      field: 'list',
      message: `Unknown --list value "${listKey}".`,
      validValues: ['generators', 'destinations'],
    });
  }

  const generator =
    schema.subGenerator ??
    schema.generator ??
    (interactive
      ? (
          await prompts({
            choices: ['component', 'hook', 'story', 'util'].map((option) => ({
              title: option,
              value: option,
            })),
            message: 'What would you like to generate?',
            name: 'subGenerator',
            type: 'select',
          })
        ).subGenerator
      : undefined);

  if (!generator) {
    throwGeneratorError({
      code: 'missing_option',
      field: 'subGenerator',
      hint: 'Re-run with --withPrompts or pass --subGenerator=component|hook|story|util.',
      message: 'Missing required option: "subGenerator".',
      validValues: ['component', 'hook', 'story', 'util'],
    });
  }

  switch (generator) {
    case 'component':
      await componentGenerator(tree, {
        destination: schema.destination,
        interactive,
        name: schema.name,
      });
      break;

    case 'hook':
      await hookGenerator(tree, {
        destination: schema.destination,
        interactive,
        name: schema.name,
      });
      break;

    case 'story':
      await storyGenerator(tree, {
        destination: schema.destination,
        interactive,
        name: schema.name,
      });
      break;

    case 'util':
      await utilGenerator(tree, {
        destination: schema.destination,
        interactive,
        name: schema.name,
      });
      break;

    default:
      throw new Error(`Invalid generator: "${generator}"`);
  }
}

export default reactGenerator;
