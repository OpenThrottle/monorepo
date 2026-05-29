/**
 * @description Scopes the nested agent's prompt to the target repository when Ralph runs with a
 * `workingDirectory` outside the OpenThrottle monorepo (a "foreign" checkout). Without this, the
 * injected `/agents/ralph` prompt + OpenThrottle workspace rules bleed OpenThrottle-developer paths
 * and commands (e.g. `applications/openthrottle-developer`, `tools/workflows`, `@tools/generators`,
 * `/skills`) into a run whose `cwd` is another repo, producing misleading inventory and shell errors.
 */

import * as path from 'node:path';
import { resolveOpenThrottleRoot } from '@openthrottle/ai-mcp/src/cortex-server';

/**
 * @description True when `childDir` is `parentDir` itself or nested within it. Uses a relative-path
 * check so it does not depend on trailing separators or case folding beyond the platform default.
 */
const isWithinDir = (parentDir: string, childDir: string): boolean => {
  const relative = path.relative(parentDir, childDir);

  return (
    relative === '' ||
    (!relative.startsWith('..') && !path.isAbsolute(relative))
  );
};

/** Resolved relationship between the current `cwd` and the OpenThrottle monorepo root. */
export interface ForeignWorkspaceContext {
  /** True when {@link workingDirectory} is outside the OpenThrottle root (a foreign checkout). */
  readonly isForeign: boolean;
  /** The resolved OpenThrottle monorepo root, or undefined when it could not be located. */
  readonly openThrottleRoot: string | undefined;
  /** The absolute working directory the agent runs in (resolved `cwd`). */
  readonly workingDirectory: string;
}

/**
 * @description Resolves whether the working directory is a foreign checkout (outside the OpenThrottle
 * monorepo). The OpenThrottle root is resolved via {@link resolveOpenThrottleRoot}
 * (`WORKFLOW_RALPH_OT_ROOT` → `WORKSPACE_ROOT` → module walk-up → cwd), so it lands inside OpenThrottle
 * even when `cwd` is another repo. When the root cannot be resolved, the run is treated as non-foreign
 * (no scoping layer) to avoid mislabeling local runs.
 */
export const resolveForeignWorkspaceContext = (
  cwd: string = process.cwd(),
  env: NodeJS.ProcessEnv = process.env,
): ForeignWorkspaceContext => {
  const workingDirectory = path.resolve(cwd);
  const openThrottleRoot = resolveOpenThrottleRoot(env);
  const isForeign =
    openThrottleRoot !== undefined &&
    !isWithinDir(openThrottleRoot, workingDirectory);

  return { isForeign, openThrottleRoot, workingDirectory };
};

/**
 * @description Builds an explicit scoping layer to prepend to the agent prompt for foreign-cwd runs,
 * or undefined when the run is inside the OpenThrottle monorepo. The layer tells the agent it is
 * operating in the target repository (not OpenThrottle) and must not reference OpenThrottle paths,
 * commands, rules, or tooling — only the injected Cortex plan/task context applies cross-repo.
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
    `Treat ${context.workingDirectory} as the only workspace. Do NOT reference, list, or run OpenThrottle-specific paths, commands, rules, generators, or tooling (e.g. applications/openthrottle-developer, tools/workflows, @tools/generators, /skills, /settings/debug, ralphTuning). Use only the conventions, scripts, and structure of the target repository.`,
    `The OpenThrottle plan and task context below is injected purely so you know what work to do; it is metadata, not a description of this repository's layout.`,
  ].join('\n');
};

/**
 * @description Convenience for callers that have the raw `cwd`/`env`: returns the scoping layer
 * string (or undefined when not foreign) without exposing the intermediate context.
 */
export const resolveForeignWorkspacePromptLayer = (
  cwd: string = process.cwd(),
  env: NodeJS.ProcessEnv = process.env,
): string | undefined =>
  buildForeignWorkspacePromptLayer(resolveForeignWorkspaceContext(cwd, env));
