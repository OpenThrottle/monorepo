import { Choice } from 'prompts';
import { getDirectoriesAtPath } from '../utils';

/**
 * @link https://github.com/<%= orgName %>/monorepo/blob/main/docs/remix/Folders.md
 * @description All our Remix applications follow the same approach regarding
 * directory structure. This allows use to create a utility function to generate
 * the choices for the prompts.
 */
export const getRemixDirectoryChoices = (rootPath: string) => {
  const choices: Choice[] = [{ title: 'global', value: 'global' }];
  const allowedSubDirectories = ['routing', 'services'];

  allowedSubDirectories.forEach((directory) => {
    const directories = getDirectoriesAtPath(`${rootPath}/${directory}`);

    directories.forEach((dir) => {
      const relativeDestination = `${directory}/${dir}`;
      choices.push({ title: relativeDestination, value: relativeDestination });
    });
  });

  return choices;
};
