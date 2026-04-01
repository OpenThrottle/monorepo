import prompts, { Choice } from 'prompts';
import type { Tree } from '@nx/devkit';
import { getProjectsByTags } from '../../utils/projects';
import { writeJsonToStdout } from '../../utils/output';
import { throwGeneratorError } from '../../utils/generator-errors';
import { isInteractiveArgPresent } from '../../utils/nx-cli';
import { generatorNestJSAIAgent } from './generator.ai-agent';
import { generatorNestJSApplication } from './generator.application';
import { generatorNestJSGraphQLService } from './generator.graphql-service';
import { generatorNestJSModule } from './generator.module';
import { generatorNestJSQueue } from './generator.queue';
import { generatorNestJSSimpleService } from './generator.simple-service';

const generators: Choice[] = [
  {
    description: `Create a new NestJS "ai-agent" using LangChain`,
    title: `ai-agent`,
    value: 'ai-agent',
  },
  {
    description: `Create a new NestJS "application" in the monorepo`,
    title: `application`,
    value: 'application',
  },
  {
    description: `Create a new NestJS "GraphQL service"`,
    title: `graphql-service`,
    value: 'graphql-service',
  },
  {
    description: `Create a new NestJS "module"`,
    title: `module`,
    value: 'module',
  },
  {
    description: `Create a new NestJS "queue" using BullMQ`,
    title: `queue`,
    value: 'queue',
  },
  {
    description: `Create a new NestJS "simple service"`,
    title: `simple-service`,
    value: 'simple-service',
  },
];

export interface NestJSGeneratorSchema {
  readonly application?: string;
  readonly describe?: boolean;
  readonly destination?: string;
  readonly generator?:
    | 'ai-agent'
    | 'application'
    | 'graphql-service'
    | 'module'
    | 'queue'
    | 'simple-service';
  readonly list?: string;
  readonly name?: string;
  readonly port?: number;
  readonly subGenerator?:
    | 'ai-agent'
    | 'application'
    | 'graphql-service'
    | 'module'
    | 'queue'
    | 'simple-service';
  readonly username?: string;
  readonly withPrompts?: boolean;
}

export async function generatorNestJS(
  tree: Tree,
  schema: NestJSGeneratorSchema = {},
): Promise<void> {
  const interactive = schema.withPrompts === true || isInteractiveArgPresent();

  if (schema.describe === true) {
    writeJsonToStdout({
      id: '@tools/generators:nestjs',
      list: {
        generators: {
          description: 'Available nestjs generator values.',
          values: generators.map((g) => g.value),
        },
        graphqlApplications: {
          description:
            'Nx projects matching tags: technology:nestjs + technology:graphql + type:application',
          source: {
            tags: [
              'technology:nestjs',
              'technology:graphql',
              'type:application',
            ],
            type: 'projectGraphTags',
          },
        },
        nestjsApplications: {
          description:
            'Nx projects matching tags: technology:nestjs + type:application',
          source: {
            tags: ['technology:nestjs', 'type:application'],
            type: 'projectGraphTags',
          },
        },
        nestjsPackages: {
          description:
            'Nx projects matching tags: technology:nestjs + type:package',
          source: {
            tags: ['technology:nestjs', 'type:package'],
            type: 'projectGraphTags',
          },
        },
      },
      options: {
        application: {
          dynamic: true,
          required: 'variesByGenerator',
          type: 'string',
        },
        destination: {
          dynamic: true,
          required: 'variesByGenerator',
          type: 'string',
        },
        name: {
          pattern: 'slug',
          required: 'variesByGenerator',
          type: 'string',
        },
        port: {
          max: 9999,
          min: 4000,
          required: 'applicationOnly',
          type: 'number',
        },
        subGenerator: { required: true, type: 'string' },
        username: {
          default: 'gh_api_user_login',
          required: false,
          type: 'string',
        },
      },
    });
    return;
  }

  if (schema.list) {
    const listKey = schema.list;

    if (listKey === 'generators') {
      writeJsonToStdout(generators.map((g) => g.value));
      return;
    }

    if (listKey === 'nestjsApplications' || listKey === 'applications') {
      const projects = await getProjectsByTags([
        'technology:nestjs',
        'type:application',
      ]);
      writeJsonToStdout(projects.map((p) => p.name).sort());
      return;
    }

    if (listKey === 'nestjsPackages' || listKey === 'packages') {
      const projects = await getProjectsByTags([
        'technology:nestjs',
        'type:package',
      ]);
      writeJsonToStdout(projects.map((p) => p.name).sort());
      return;
    }

    if (listKey === 'graphqlApplications') {
      const projects = await getProjectsByTags([
        'technology:graphql',
        'technology:nestjs',
        'type:application',
      ]);
      writeJsonToStdout(projects.map((p) => p.name).sort());
      return;
    }

    throwGeneratorError({
      code: 'unknown_list_key',
      field: 'list',
      message: `Unknown --list value "${listKey}".`,
      validValues: [
        'generators',
        'graphqlApplications',
        'nestjsApplications',
        'nestjsPackages',
      ],
    });
  }

  const generator =
    schema.subGenerator ??
    schema.generator ??
    (interactive
      ? (
          await prompts({
            choices: generators,
            message: 'Select a generator',
            name: 'subGenerator',
            type: 'select',
          })
        ).subGenerator
      : undefined);

  if (!generator) {
    throwGeneratorError({
      code: 'missing_option',
      field: 'subGenerator',
      hint: 'Re-run with --withPrompts or pass --subGenerator=<type>.',
      message: 'Missing required option: "subGenerator".',
      validValues: generators.map((g) => g.value),
    });
  }

  switch (generator) {
    case 'ai-agent':
      await generatorNestJSAIAgent(tree, {
        application: schema.application,
        interactive,
        name: schema.name,
      });
      break;

    case 'application':
      await generatorNestJSApplication(tree, {
        interactive,
        name: schema.name,
        port: schema.port,
        username: schema.username,
      });
      break;

    case 'graphql-service':
      await generatorNestJSGraphQLService(tree, {
        application: schema.application,
        interactive,
        name: schema.name,
      });
      break;

    case 'module':
      await generatorNestJSModule(tree, {
        application: schema.application,
        destination: schema.destination,
        interactive,
        name: schema.name,
      });
      break;

    case 'simple-service':
      await generatorNestJSSimpleService(tree, {
        application: schema.application,
        interactive,
        name: schema.name,
      });
      break;

    case 'queue':
      await generatorNestJSQueue(tree, {
        application: schema.application,
        interactive,
        name: schema.name,
      });
      break;

    default:
      throw new Error(`Invalid generator: "${generator}"`);
  }
}

export default generatorNestJS;
