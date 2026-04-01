import prompts from 'prompts';
import type { Tree } from '@nx/devkit';
import {
  getMonorepoApplications,
  getRemixRoutingFolders,
  getRemixServiceFolders,
} from '../../utils';
import { writeJsonToStdout } from '../../utils/output';
import { throwGeneratorError } from '../../utils/generator-errors';
import { isInteractiveArgPresent } from '../../utils/nx-cli';
import { generatorRemixApplication } from './generator.application';
import { generatorRemixComponent } from './generator.component';
import { generatorRemixForm } from './generator.form';
import { generatorRemixModal } from './generator.modal';
import { generatorRemixRoute } from './generator.route';
import { generatorRemixTable } from './generator.table';

export interface RemixGeneratorSchema {
  readonly application?: string;
  readonly describe?: boolean;
  readonly folder?: string;
  readonly list?: string;
  readonly name?: string;
  readonly subGenerator?:
    | 'application'
    | 'component'
    | 'form'
    | 'modal'
    | 'route'
    | 'table';
  readonly withPrompts?: boolean;
}

export async function remixGenerator(
  tree: Tree,
  schema: RemixGeneratorSchema = {},
): Promise<void> {
  const interactive = schema.withPrompts === true || isInteractiveArgPresent();

  if (schema.describe === true) {
    writeJsonToStdout({
      id: '@tools/generators:remix',
      list: {
        applications: {
          description: `Monorepo applications (Nx projects tagged type:application).`,
          source: { tags: ['type:application'], type: 'projectGraphTags' },
        },
        componentFolders: {
          description: `Component destination folders under applications/<app>/app (requires --application).`,
          source: { requires: ['application'], type: 'filesystem' },
        },
        generators: {
          description: 'Available remix generator values.',
          values: [
            'application',
            'component',
            'form',
            'modal',
            'route',
            'table',
          ],
        },
        modalFolders: {
          description: `Modal destination folders under applications/<app>/app (requires --application).`,
          source: { requires: ['application'], type: 'filesystem' },
        },
      },
      options: {
        application: {
          dynamic: true,
          required: 'variesByGenerator',
          type: 'string',
        },
        folder: {
          dynamic: true,
          required: 'variesByGenerator',
          type: 'string',
        },
        name: {
          description: 'Comma-separated names supported.',
          required: true,
          type: 'string',
        },
        subGenerator: {
          enum: ['application', 'component', 'form', 'modal', 'route', 'table'],
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
      writeJsonToStdout([
        'application',
        'component',
        'form',
        'modal',
        'route',
        'table',
      ]);
      return;
    }

    if (listKey === 'applications') {
      writeJsonToStdout(await getMonorepoApplications());
      return;
    }

    if (
      listKey === 'routingFolders' ||
      listKey === 'serviceFolders' ||
      listKey === 'componentFolders' ||
      listKey === 'formFolders' ||
      listKey === 'tableFolders' ||
      listKey === 'modalFolders'
    ) {
      const application = schema.application;
      if (!application) {
        throw new Error(
          `Missing required option: "application" for --list=${listKey}. Pass --application=<app>.`,
        );
      }

      const routing = getRemixRoutingFolders(application);
      const services = getRemixServiceFolders(application);
      const global = ['global/components'];
      const routingComponentFolders = routing.map(
        (name) => `routing/${name}/components`,
      );
      const serviceComponentFolders = services.map(
        (name) => `services/${name}/components`,
      );

      if (listKey === 'routingFolders') {
        writeJsonToStdout(routing.sort());
        return;
      }

      if (listKey === 'serviceFolders') {
        writeJsonToStdout(services.sort());
        return;
      }

      if (listKey === 'modalFolders') {
        writeJsonToStdout([...global, ...routingComponentFolders].sort());
        return;
      }

      writeJsonToStdout(
        [
          ...global,
          ...routingComponentFolders,
          ...serviceComponentFolders,
        ].sort(),
      );
      return;
    }

    throwGeneratorError({
      code: 'unknown_list_key',
      field: 'list',
      message: `Unknown --list value "${listKey}".`,
      validValues: [
        'generators',
        'applications',
        'routingFolders',
        'serviceFolders',
        'componentFolders',
        'formFolders',
        'tableFolders',
        'modalFolders',
      ],
    });
  }

  const generator =
    schema.subGenerator ??
    (interactive
      ? (
          await prompts({
            choices: [
              'application',
              'component',
              'form',
              'modal',
              'route',
              'table',
            ].map((option) => ({
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
      hint: 'Re-run with --withPrompts or pass --subGenerator=application|component|form|modal|route|table.',
      message: 'Missing required option: "subGenerator".',
      validValues: [
        'application',
        'component',
        'form',
        'modal',
        'route',
        'table',
      ],
    });
  }

  switch (generator) {
    case 'application':
      await generatorRemixApplication(tree, { interactive, name: schema.name });
      break;

    case 'component':
      await generatorRemixComponent(tree, {
        application: schema.application,
        folder: schema.folder,
        interactive,
        name: schema.name,
      });
      break;

    case 'form':
      await generatorRemixForm(tree, {
        application: schema.application,
        folder: schema.folder,
        interactive,
        name: schema.name,
      });
      break;

    case 'modal':
      await generatorRemixModal(tree, {
        application: schema.application,
        folder: schema.folder,
        interactive,
        name: schema.name,
      });
      break;

    case 'route':
      await generatorRemixRoute(tree, {
        application: schema.application,
        interactive,
        name: schema.name,
      });
      break;

    case 'table':
      await generatorRemixTable(tree, {
        application: schema.application,
        folder: schema.folder,
        interactive,
        name: schema.name,
      });
      break;

    default:
      throw new Error(`Invalid generator: "${generator}"`);
  }
}

export default remixGenerator;
