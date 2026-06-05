/**
 * @description Builds Postgres connection config from env (POSTGRES_URL or POSTGRES_*).
 */

import * as fs from 'node:fs';
import {
  getOpenThrottleRoot,
  getPostgresUrl,
  OPENTHROTTLE_POSTGRES_URL_ENV,
  prependOpenThrottleBinToPath,
  resolveOpenThrottleBinDir,
  WORKFLOW_RALPH_OT_ROOT_ENV,
} from '@openthrottle/openthrottle-agentic-utils';

export { OPENTHROTTLE_POSTGRES_URL_ENV, WORKFLOW_RALPH_OT_ROOT_ENV };

/**
 * @description When set (non-empty after trim) on the BullMQ worker, nested `workflow-ralph` children receive this as `HOME` so Claude Code and similar CLIs resolve OAuth paths under a directory you control (e.g. bind-mount host credentials into `/var/ralph-home` and set this to that path).
 */
export const WORKFLOW_RALPH_SPAWN_HOME_ENV = `WORKFLOW_RALPH_SPAWN_HOME`;

/**
 * @description When set on the worker, nested Ralph children receive this as `XDG_CONFIG_HOME` for tools that read config from XDG paths instead of `HOME` alone.
 */
export const WORKFLOW_RALPH_SPAWN_XDG_CONFIG_HOME_ENV = `WORKFLOW_RALPH_SPAWN_XDG_CONFIG_HOME`;

export interface CortexPostgresConfig {
  readonly connectionString: string;
}

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
 * @description Resolves the OpenThrottle `node_modules/.bin` directory.
 * @deprecated Import {@link resolveOpenThrottleBinDir} from `@openthrottle/openthrottle-agentic-utils` instead.
 */
export function resolveWorkflowRalphBinDir(
  env: NodeJS.ProcessEnv = process.env,
): string | undefined {
  return resolveOpenThrottleBinDir(env);
}

/**
 * @description Prepends the OpenThrottle `node_modules/.bin` directory to PATH.
 * @deprecated Import {@link prependOpenThrottleBinToPath} from `@openthrottle/openthrottle-agentic-utils` instead.
 */
export const applyWorkflowRalphBinPath = prependOpenThrottleBinToPath;

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

/** Pre-merged spawn/transport from `.workflow-ralph.json` + env (via `@tools/workflows` loader). */
export interface WorkflowRalphSpawnMergedDefaults {
  readonly spawn?: {
    readonly home?: string;
    readonly otRoot?: string;
    readonly xdgConfigHome?: string;
  };
  readonly transport?: 'graphql' | 'postgres-direct';
}

/** Optional overrides for {@link buildWorkflowRalphSpawnEnv}. */
export interface BuildWorkflowRalphSpawnEnvOptions {
  /**
   * When set (non-empty), forces nested Ralph to use this URL (e.g. same string as TypeORM `url`),
   * regardless of `workerEnv`, so foreign `cwd` tooling cannot desync plan lookup from the API DB.
   * Used when `WORKFLOW_RALPH_TRANSPORT=postgres-direct`.
   */
  readonly canonicalCortexPostgresUrl?: string;
  /**
   * When set (non-empty), forces nested Ralph GraphQL auth regardless of `workerEnv` (default transport).
   */
  readonly canonicalWorkflowGraphqlAuth?: string;
  /**
   * When set (non-empty), forces nested Ralph GraphQL HTTP endpoint regardless of `workerEnv`.
   */
  readonly canonicalWorkflowGraphqlUrl?: string;
  /**
   * File + env merged spawn/transport from {@link loadWorkflowRalphConfig} (caller supplies;
   * ai-mcp does not read `.workflow-ralph.json` directly). Env vars on `workerEnv` still win.
   */
  readonly mergedDefaults?: WorkflowRalphSpawnMergedDefaults;
}

/** Env var: `graphql` (default) or `postgres-direct` for Ralph plan/task I/O rollback. */
export const WORKFLOW_RALPH_TRANSPORT_ENV = `WORKFLOW_RALPH_TRANSPORT`;

const resolveWorkflowRalphTransportFromSpawnEnv = (
  env: NodeJS.ProcessEnv,
  merged?: WorkflowRalphSpawnMergedDefaults,
): 'graphql' | 'postgres-direct' => {
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
    'MCP_DEVELOPER_AUTH_TOKEN',
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
    const trimmed = options?.canonicalCortexPostgresUrl?.trim();
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

/**
 * @description Returns Cortex Postgres connection string from POSTGRES_URL or POSTGRES_* env vars.
 * @returns Connection config or undefined if not configured.
 */
export function getPostgresConfig(): CortexPostgresConfig {
  return { connectionString: getPostgresUrl() };
}

/**
 * @description Returns the canonical GitHub username for author/assignee when set.
 * Used to enforce GitHub username (not display name) for plan and task author/assignee.
 * Reads GITHUB_USER (trimmed).
 */
export function getDefaultGitHubUser(): string | undefined {
  const username = process.env.GITHUB_USER?.trim() ?? '';

  return username === '' ? undefined : username;
}
