import type { ProjectGraphProjectNode } from '@nx/devkit';
import { createProjectGraphAsync } from '@nx/devkit';

import { askWhenInteractive } from './ask-when-interactive.ts';

/**
 * @description The Nx project a React generator writes into: the
 * `--destination` node when one was passed, else the package `ask` prompts for
 * on an interactive run, else `undefined`.
 */
export const resolveReactDestination = async (
  destination: string | undefined,
  interactive: boolean,
  ask: () => Promise<ProjectGraphProjectNode>,
): Promise<ProjectGraphProjectNode | undefined> => {
  if (destination) {
    const { nodes } = await createProjectGraphAsync();
    return nodes[destination];
  }

  return askWhenInteractive(interactive, ask);
};
