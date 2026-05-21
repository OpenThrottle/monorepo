import { logger } from '@nx/devkit';
import prompts from 'prompts';
import { MESSAGE_ON_CANCEL } from './messages';
import { getProjectsByTags } from './projects';
import { parseCommaSeparatedValues } from './strings';
import { validatePascalCase, validatePort, validateSlug } from './validation';
import { getMonorepoApplications } from './index';

/**
 * Get the destination "project" for a new React component.
 */
export const getReactComponentDestination = async () => {
  const tags = ['technology:react'];
  const projects = await getProjectsByTags(tags);

  const names = projects.map((entry) => entry.name).sort();

  const { package: packageName } = await prompts({
    choices: names.map((name) => ({ title: name, value: name })),
    message: 'Select a package',
    name: 'package',
    type: 'select',
  });

  if (!packageName) throw new Error('No package selected');

  const project = projects.find((entry) => {
    return entry.name === packageName;
  });

  if (!project) throw new Error('No project found');

  return project;
};

/**
 * Get the destination "package" for a new React hook. This generator differs
 * from the "component" generator as its tests use a slightly different setup.
 */
export const getReactHookDestination = async () => {
  const tags = ['technology:react'];
  const targets = await getProjectsByTags(tags);
  const names = targets.map((entry) => entry.name).sort();

  const { destination } = await prompts({
    choices: names.map((name) => ({ title: name, value: name })),
    message: 'Select a destination',
    name: 'destination',
    type: 'select',
  });

  if (!destination) throw new Error('No destination selected');

  const project = targets.find((entry) => {
    return entry.name === destination;
  });

  if (!project) throw new Error('No project found');

  return project;
};

export const parsePossibleNames = (value: string) => {
  return parseCommaSeparatedValues(value);
};

export const getComponentNames = async () => {
  const { name } = await prompts({
    message: 'Component name(s)?',
    name: 'name',
    type: 'text',
    validate: (value) => {
      const values = parsePossibleNames(value);
      const errors: string[] = [];

      values.forEach((value: string) => {
        const error = validatePascalCase(value);
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

export const getConfigConfirmation = async (
  config: Record<string, unknown>,
): Promise<void> => {
  const data = JSON.stringify(config, null, 2);

  logger.info(`\n${data}\n`);

  const { confirmation } = await prompts({
    initial: true,
    message: `Does the information above look correct?`,
    name: 'confirmation',
    type: 'confirm',
  });

  if (!confirmation) throw new Error(MESSAGE_ON_CANCEL);
};

export const getOrganizationName = async (): Promise<string> => {
  const options: string[] = ['@openthrottle', '@tools'];

  const { organization } = await prompts<string>({
    choices: options.map((option) => ({ title: option, value: option })),
    message: '🤖 Which organization should we use?',
    name: 'organization',
    type: 'select',
  });

  if (!organization) throw new Error('No organization selected');

  return organization.toString();
};

export const getPackageName = async () => {
  const { name } = await prompts({
    message: 'Package name?',
    name: 'name',
    type: 'text',
    validate: (value) => {
      const error = validateSlug(value);
      return error ? `Package name ${error.toLowerCase()}.` : true;
    },
  });

  if (!name) throw new Error('No name provided');

  return name;
};

export const getTargetApplication = async () => {
  const applications = await getMonorepoApplications();
  const { application } = await prompts({
    choices: applications.map((name) => ({ title: name, value: name })),
    message: 'Which application should we generate this in?',
    name: 'application',
    type: 'select',
  });

  if (!application) throw new Error('No application selected');

  return application;
};

export const getTargetName = async (message: string) => {
  const { name } = await prompts({
    message,
    name: 'name',
    type: 'text',
    validate: (value: string) => {
      const error = validateSlug(value);
      return error ? error : true;
    },
  });

  if (!name) throw new Error(MESSAGE_ON_CANCEL);

  return name;
};

export const getTargetPort = async () => {
  const { port } = await prompts({
    hint: '- We recommend incrementing our ports by 10 on top of the latest application port.',
    message: 'Port number (4000 - 9999)',
    name: 'port',
    type: 'number',
    validate: (value: number) => {
      const error = validatePort(value);
      return error ? error : true;
    },
  });

  if (!port) throw new Error(MESSAGE_ON_CANCEL);

  return port;
};
