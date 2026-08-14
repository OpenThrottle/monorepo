/**
 * @description Scopes the agent prompt to the target repository when Ralph runs with a
 * `workingDirectory` outside the OpenThrottle monorepo (a "foreign" checkout).
 */

import * as path from 'node:path';

import { getOpenThrottleRoot } from './workflow.ts';

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

/** @description Options for {@link buildForeignWorkspacePromptLayer}. */
export interface ForeignWorkspacePromptLayerOptions {
  /**
   * Names of OpenThrottle curated skills materialized into this foreign repo for the run
   * (server-scoped injection). When non-empty, the prompt tells the agent these skills ARE
   * available here instead of blanket-forbidding OT `/skills`.
   */
  readonly injectedSkillNames?: readonly string[];
}

/**
 * @description Builds repository-scope prompt text for foreign-cwd runs, or undefined when inside OT.
 *
 * When OpenThrottle has injected a curated skill subset into this repo (`injectedSkillNames`), the
 * layer advertises those skills as available rather than forbidding `/skills` wholesale — it still
 * forbids OT-monorepo-specific paths, generators, and tooling that do not apply to the target repo.
 */
export const buildForeignWorkspacePromptLayer = (
  context: ForeignWorkspaceContext,
  options: ForeignWorkspacePromptLayerOptions = {},
): string | undefined => {
  if (!context.isForeign) {
    return undefined;
  }

  const otRootNote =
    context.openThrottleRoot !== undefined
      ? ` (the OpenThrottle monorepo lives at ${context.openThrottleRoot} and is NOT this repository)`
      : '';

  const injected = options.injectedSkillNames ?? [];
  const hasInjectedSkills = injected.length > 0;

  // With curated skills injected, `/skills` is legitimately available here, so it is dropped from
  // the denylist; the OT-monorepo-specific paths/generators/tooling remain forbidden.
  const forbidden = hasInjectedSkills
    ? `Do NOT reference, list, or run OpenThrottle-monorepo-specific paths, commands, rules, generators, or tooling (e.g. applications/openthrottle-developer, tools/workflows, @tools/generators, /settings/debug, ralphTuning). Use only the conventions, scripts, and structure of the target repository — plus the OpenThrottle skills noted below.`
    : `Do NOT reference, list, or run OpenThrottle-specific paths, commands, rules, generators, or tooling (e.g. applications/openthrottle-developer, tools/workflows, @tools/generators, /skills, /settings/debug, ralphTuning). Use only the conventions, scripts, and structure of the target repository.`;

  const lines = [
    `IMPORTANT — Repository scope: You are operating in the repository at ${context.workingDirectory}, NOT the OpenThrottle monorepo${otRootNote}.`,
    `Treat ${context.workingDirectory} as the only workspace. Make file changes under this directory when tasks require implementation work.`,
    forbidden,
  ];

  if (hasInjectedSkills) {
    lines.push(
      `OpenThrottle has made these curated skills available in this repository (under .agents/skills and .claude/skills): ${[
        ...injected,
      ]
        .map((name) => `/${name}`)
        .join(
          ', ',
        )}. You MAY invoke them like any other skill; they are safe to use here.`,
    );
  }

  lines.push(
    `The OpenThrottle plan and task context below is injected purely so you know what work to do; it is metadata, not a description of this repository's layout.`,
  );

  return lines.join('\n');
};

/**
 * @description Convenience: scoping layer string (or undefined) from cwd and env.
 */
export const resolveForeignWorkspacePromptLayer = (
  cwd: string = process.cwd(),
  env: NodeJS.ProcessEnv = process.env,
  options: ForeignWorkspacePromptLayerOptions = {},
): string | undefined =>
  buildForeignWorkspacePromptLayer(
    resolveForeignWorkspaceContext(cwd, env),
    options,
  );
