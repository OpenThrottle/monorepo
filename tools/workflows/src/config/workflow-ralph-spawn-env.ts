/**
 * @description Builds the env passed to nested `pnpm exec workflow-ralph` children:
 * GraphQL auth/URL (default transport) or canonical Postgres URL (rollback), plus PATH,
 * HOME/XDG, and WORKFLOW_RALPH_OT_ROOT so a foreign `cwd` cannot desync plan I/O.
 */

import * as fs from 'node:fs';
import {
  getOpenThrottleRoot,
  getPostgresUrl,
  OPENTHROTTLE_POSTGRES_URL_ENV,
  prependOpenThrottleBinToPath,
  WORKFLOW_RALPH_OT_ROOT_ENV,
} from '@openthrottle/openthrottle-agentic-utils';
import {
  WORKFLOW_RALPH_TRANSPORT_ENV,
  type WorkflowRalphTransport,
} from '../utils/workflow-transport.js';

/**
 * @description When set (non-empty after trim) on the BullMQ worker, nested `workflow-ralph` children receive this as `HOME` so Claude Code and similar CLIs resolve OAuth paths under a directory you control (e.g. bind-mount host credentials into `/var/ralph-home` and set this to that path).
 */
export const WORKFLOW_RALPH_SPAWN_HOME_ENV = `WORKFLOW_RALPH_SPAWN_HOME`;

/**
 * @description When set on the worker, nested Ralph children receive this as `XDG_CONFIG_HOME` for tools that read config from XDG paths instead of `HOME` alone.
 */
export const WORKFLOW_RALPH_SPAWN_XDG_CONFIG_HOME_ENV = `WORKFLOW_RALPH_SPAWN_XDG_CONFIG_HOME`;

/**
 * @description Returns true when `dir` exists and is a directory. Never throws.
 */
const isDirectory = (dir: string): boolean => {
  try {
    return fs.statSync(dir).isDirectory();
  } catch {
    return false;
  }
};

/**
 * @description Resolves Cortex Postgres URL from env. Prefer {@link OPENTHROTTLE_POSTGRES_URL_ENV} (injected at spawn), then `POSTGRES_URL`, then `POSTGRES_*` pieces.
 * @returns Connection string or `undefined` when required vars are missing.
 * @deprecated Import {@link getPostgresUrl} from `@openthrottle/openthrottle-agentic-utils` instead.
 */
export function resolveCortexPostgresConnectionStringFromEnv(
  env: NodeJS.ProcessEnv = process.env,
): string | undefined {
  try {
    return getPostgresUrl(env);
  } catch {
    return undefined;
  }
}

/**
 * @description Applies optional identity overrides from env and optional merged file defaults so queue workers can align nested CLIs with mounted credentials.
 */
export function applyWorkflowRalphSpawnIdentityOverrides(
  env: NodeJS.ProcessEnv,
  merged?: WorkflowRalphSpawnMergedDefaults,
): NodeJS.ProcessEnv {
  const { home, xdgConfigHome } = resolveEffectiveSpawnIdentity(env, merged);

  if (
    (home === undefined || home === '') &&
    (xdgConfigHome === undefined || xdgConfigHome === '')
  ) {
    return env;
  }

  return {
    ...env,
    ...(home !== undefined && home !== '' ? { HOME: home } : {}),
    ...(xdgConfigHome !== undefined && xdgConfigHome !== ''
      ? { XDG_CONFIG_HOME: xdgConfigHome }
      : {}),
  };
}

/** Pre-merged spawn/transport from `.workflow-ralph.json` + env (via `loadWorkflowRalphConfig`). */
export interface WorkflowRalphSpawnMergedDefaults {
  readonly spawn?: {
    readonly home?: string;
    readonly otRoot?: string;
    readonly xdgConfigHome?: string;
  };
  readonly transport?: WorkflowRalphTransport;
}

/** Optional overrides for {@link buildWorkflowRalphSpawnEnv}. */
export interface BuildWorkflowRalphSpawnEnvOptions {
  /**
   * When set (non-empty), forces nested Ralph to use this URL (e.g. same string as TypeORM `url`),
   * regardless of `workerEnv`, so foreign `cwd` tooling cannot desync plan lookup from the API DB.
   * Used when `WORKFLOW_RALPH_TRANSPORT=postgres-direct`.
   */
  readonly canonicalPostgresUrl?: string;
  /**
   * When set (non-empty), forces nested Ralph GraphQL auth regardless of `workerEnv` (default transport).
   */
  readonly canonicalWorkflowGraphqlAuth?: string;
  /**
   * When set (non-empty), forces nested Ralph GraphQL HTTP endpoint regardless of `workerEnv`.
   */
  readonly canonicalWorkflowGraphqlUrl?: string;
  /**
   * File + env merged spawn/transport from {@link loadWorkflowRalphConfig} (caller supplies).
   * Env vars on `workerEnv` still win.
   */
  readonly mergedDefaults?: WorkflowRalphSpawnMergedDefaults;
}

const resolveWorkflowRalphTransportFromSpawnEnv = (
  env: NodeJS.ProcessEnv,
  merged?: WorkflowRalphSpawnMergedDefaults,
): WorkflowRalphTransport => {
  const raw = env[WORKFLOW_RALPH_TRANSPORT_ENV]?.trim().toLowerCase();

  if (raw === 'postgres-direct' || raw === 'postgres') {
    return 'postgres-direct';
  }

  if (raw === 'graphql') {
    return 'graphql';
  }

  return merged?.transport ?? 'graphql';
};

const resolveEffectiveSpawnIdentity = (
  env: NodeJS.ProcessEnv,
  merged?: WorkflowRalphSpawnMergedDefaults,
): {
  readonly home: string | undefined;
  readonly xdgConfigHome: string | undefined;
} => {
  const home =
    env[WORKFLOW_RALPH_SPAWN_HOME_ENV]?.trim() ||
    merged?.spawn?.home?.trim() ||
    undefined;
  const xdgConfigHome =
    env[WORKFLOW_RALPH_SPAWN_XDG_CONFIG_HOME_ENV]?.trim() ||
    merged?.spawn?.xdgConfigHome?.trim() ||
    undefined;

  return { home, xdgConfigHome };
};

const resolveEffectiveOpenThrottleRoot = (
  env: NodeJS.ProcessEnv,
  merged?: WorkflowRalphSpawnMergedDefaults,
): string | undefined => {
  const explicitEnv = env[WORKFLOW_RALPH_OT_ROOT_ENV]?.trim();
  if (
    explicitEnv !== undefined &&
    explicitEnv !== '' &&
    isDirectory(explicitEnv)
  ) {
    return explicitEnv;
  }

  const fromMerged = merged?.spawn?.otRoot?.trim();
  if (
    fromMerged !== undefined &&
    fromMerged !== '' &&
    isDirectory(fromMerged)
  ) {
    return fromMerged;
  }

  return getOpenThrottleRoot(env);
};

const resolveWorkflowGraphqlAuthFromSpawnEnv = (
  env: NodeJS.ProcessEnv,
): string | undefined => {
  const keys = [
    'OPENTHROTTLE_WORKER_GRAPHQL_AUTH_TOKEN',
    'OPENTHROTTLE_WORKFLOWS_AUTH_TOKEN',
    'OPENTHROTTLE_MCP_AUTH_TOKEN',
  ] as const;

  for (const key of keys) {
    const trimmed = env[key]?.trim();
    if (trimmed !== undefined && trimmed !== '') {
      return trimmed;
    }
  }

  return undefined;
};

const resolveWorkflowGraphqlUrlFromSpawnEnv = (
  env: NodeJS.ProcessEnv,
): string | undefined => {
  const worker = env.OPENTHROTTLE_WORKER_GRAPHQL_URL?.trim();
  if (worker !== undefined && worker !== '') {
    return worker;
  }

  const workflows = env.OPENTHROTTLE_WORKFLOWS_GRAPHQL_URL?.trim();
  if (workflows !== undefined && workflows !== '') {
    return workflows;
  }

  return undefined;
};

/**
 * @description Env passed to nested `pnpm exec workflow-ralph`: GraphQL auth/URL (default) or canonical Postgres URL (rollback), plus PATH with OpenThrottle `node_modules/.bin` for deterministic `workflow-ralph` resolution from a foreign `cwd` (see {@link prependOpenThrottleBinToPath}).
 */
export function buildWorkflowRalphSpawnEnv(
  workerEnv: NodeJS.ProcessEnv,
  options?: BuildWorkflowRalphSpawnEnvOptions,
): NodeJS.ProcessEnv {
  const merged = options?.mergedDefaults;
  const transport = resolveWorkflowRalphTransportFromSpawnEnv(
    workerEnv,
    merged,
  );
  let env: NodeJS.ProcessEnv = {
    ...workerEnv,
    [WORKFLOW_RALPH_TRANSPORT_ENV]: transport,
  };

  if (transport === 'graphql') {
    const auth =
      options?.canonicalWorkflowGraphqlAuth?.trim() ||
      resolveWorkflowGraphqlAuthFromSpawnEnv(workerEnv);
    const graphqlUrl =
      options?.canonicalWorkflowGraphqlUrl?.trim() ||
      resolveWorkflowGraphqlUrlFromSpawnEnv(workerEnv);

    if (auth !== undefined) {
      env = { ...env, OPENTHROTTLE_WORKFLOWS_AUTH_TOKEN: auth };
    }

    if (graphqlUrl !== undefined) {
      env = { ...env, OPENTHROTTLE_WORKFLOWS_GRAPHQL_URL: graphqlUrl };
    }
  } else {
    const trimmed = options?.canonicalPostgresUrl?.trim();
    const conn =
      trimmed !== undefined && trimmed !== ''
        ? trimmed
        : resolveCortexPostgresConnectionStringFromEnv(workerEnv);

    if (conn !== undefined) {
      env = {
        ...env,
        [OPENTHROTTLE_POSTGRES_URL_ENV]: conn,
        POSTGRES_URL: conn,
      };
    }
  }

  const otRoot = resolveEffectiveOpenThrottleRoot(workerEnv, merged);
  const envWithOtRoot =
    otRoot !== undefined
      ? { ...env, [WORKFLOW_RALPH_OT_ROOT_ENV]: otRoot }
      : env;

  const withBinPath = prependOpenThrottleBinToPath(envWithOtRoot);

  return applyWorkflowRalphSpawnIdentityOverrides(withBinPath, merged);
}
