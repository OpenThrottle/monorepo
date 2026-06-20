/**
 * @description Scopes the agent prompt to the target repository when Ralph runs with a
 * `workingDirectory` outside the OpenThrottle monorepo (a "foreign" checkout).
 */

import * as path from 'node:path';

import { getOpenThrottleRoot } from './workflow.js';

/**
 * @description True when `childDir` is `parentDir` itself or nested within it.
 */
const isWithinDir = (parentDir: string, childDir: string): boolean => {
  const relative = path.relative(parentDir, childDir);

  return (
    relative === '' ||
    (!relative.startsWith('..') && !path.isAbsolute(relative))
  );
};

/** Resolved relationship between the agent cwd and the OpenThrottle monorepo root. */
export interface ForeignWorkspaceContext {
  readonly isForeign: boolean;
  readonly openThrottleRoot: string | undefined;
  readonly workingDirectory: string;
}

/**
 * @description Resolves whether the working directory is outside the OpenThrottle monorepo.
 */
export const resolveForeignWorkspaceContext = (
  cwd: string = process.cwd(),
  env: NodeJS.ProcessEnv = process.env,
): ForeignWorkspaceContext => {
  const workingDirectory = path.resolve(cwd);
  const openThrottleRoot = getOpenThrottleRoot(env);
  const isForeign =
    openThrottleRoot !== undefined &&
    !isWithinDir(openThrottleRoot, workingDirectory);

  return { isForeign, openThrottleRoot, workingDirectory };
};

/**
 * @description Builds repository-scope prompt text for foreign-cwd runs, or undefined when inside OT.
 */
export const buildForeignWorkspacePromptLayer = (
  context: ForeignWorkspaceContext,
): string | undefined => {
  if (!context.isForeign) {
    return undefined;
  }

  const otRootNote =
    context.openThrottleRoot !== undefined
      ? ` (the OpenThrottle monorepo lives at ${context.openThrottleRoot} and is NOT this repository)`
      : '';

  return [
    `IMPORTANT — Repository scope: You are operating in the repository at ${context.workingDirectory}, NOT the OpenThrottle monorepo${otRootNote}.`,
    `Treat ${context.workingDirectory} as the only workspace. Make file changes under this directory when tasks require implementation work.`,
    `Do NOT reference, list, or run OpenThrottle-specific paths, commands, rules, generators, or tooling (e.g. applications/openthrottle-developer, tools/workflows, @tools/generators, /skills, /settings/debug, ralphTuning). Use only the conventions, scripts, and structure of the target repository.`,
    `The OpenThrottle plan and task context below is injected purely so you know what work to do; it is metadata, not a description of this repository's layout.`,
  ].join('\n');
};

/**
 * @description Convenience: scoping layer string (or undefined) from cwd and env.
 */
export const resolveForeignWorkspacePromptLayer = (
  cwd: string = process.cwd(),
  env: NodeJS.ProcessEnv = process.env,
): string | undefined =>
  buildForeignWorkspacePromptLayer(resolveForeignWorkspaceContext(cwd, env));
