/**
 * @description Nested Ralph spawn env: merges `.workflow-ralph.json` + worker env via
 * {@link loadWorkflowRalphConfig}, then delegates to {@link buildWorkflowRalphSpawnEnv}.
 */

import type { BuildWorkflowRalphSpawnEnvOptions } from '@openthrottle/ai-mcp/src/config';
import {
  buildWorkflowRalphSpawnEnv,
  resolveOpenThrottleRoot,
  WORKFLOW_RALPH_OT_ROOT_ENV,
} from '@openthrottle/ai-mcp/src/cortex-server';
import { getWorkflowConfigCwd } from '@openthrottle/openthrottle-agentic-utils';
import { loadWorkflowRalphConfig } from './load-workflow-ralph-config.js';

/**
 * @description Resolves Ralph config cwd for queue workers: job worktree, then `WORKSPACE_ROOT`, then process cwd.
 * @deprecated Import {@link getWorkflowConfigCwd} from `@openthrottle/openthrottle-agentic-utils` instead.
 */
export function resolveWorkflowRalphConfigCwd(
  workingDirectory: string | undefined,
  env: NodeJS.ProcessEnv = process.env,
): string {
  return getWorkflowConfigCwd(workingDirectory, env);
}

/**
 * @description Builds nested `workflow-ralph` child env with file + env precedence for spawn tuning.
 */
export const buildNestedWorkflowRalphSpawnEnv = (
  spawnCwd: string,
  workerEnv: NodeJS.ProcessEnv = process.env,
  options?: BuildWorkflowRalphSpawnEnvOptions,
): NodeJS.ProcessEnv => {
  const merged = loadWorkflowRalphConfig(spawnCwd, workerEnv);

  return buildWorkflowRalphSpawnEnv(workerEnv, {
    ...options,
    mergedDefaults: {
      spawn: merged.spawn,
      transport: merged.transport,
    },
  });
};

/**
 * @description Sets {@link WORKFLOW_RALPH_OT_ROOT_ENV} from file, env, or module walk-up when unset.
 */
export const applyWorkflowRalphOtRootFromConfig = (
  cwd: string,
  env: NodeJS.ProcessEnv = process.env,
): void => {
  if ((env[WORKFLOW_RALPH_OT_ROOT_ENV]?.trim() ?? '') !== '') {
    return;
  }

  const config = loadWorkflowRalphConfig(cwd, env);
  const fromConfig = config.spawn.otRoot?.trim();
  if (fromConfig !== undefined && fromConfig !== '') {
    env[WORKFLOW_RALPH_OT_ROOT_ENV] = fromConfig;
    return;
  }

  const resolved = resolveOpenThrottleRoot(env);
  if (resolved !== undefined) {
    env[WORKFLOW_RALPH_OT_ROOT_ENV] = resolved;
  }
};
