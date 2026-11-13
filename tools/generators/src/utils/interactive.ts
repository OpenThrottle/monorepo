import type { ProjectGraphProjectNode } from '@nx/devkit';
import { createProjectGraphAsync } from '@nx/devkit';

/**
 * @description Runs `ask` only for an interactive generator run. A
 * non-interactive run resolves `undefined`, so the caller's missing-option
 * error fires instead of a prompt.
 */
export const askWhenInteractive = async <TAnswer>(
  interactive: boolean,
  ask: () => Promise<TAnswer>,
): Promise<TAnswer | undefined> => {
  if (!interactive) {
    return undefined;
  }

  return ask();
};

export const isInteractiveArgPresent = (): boolean => {
  return (
    process.argv.includes('--interactive') ||
    process.argv.includes('--interactive=true') ||
    process.argv.includes('--interactive=1')
  );
};

export const writeJsonToStdout = (value: unknown): void => {
  // Nx captures stdout/stderr; keep output strictly JSON for agents.
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
};

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
