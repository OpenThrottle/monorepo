/**
 * @description Builds Postgres connection config from env (POSTGRES_URL or POSTGRES_*).
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

export interface CortexPostgresConfig {
  readonly connectionString: string;
}

/**
 * @description Env var set by BullMQ workers when spawning nested `workflow-ralph` so plan lookup uses the same Cortex DB as the server even when `cwd` is another repo whose tooling overwrites `POSTGRES_URL`.
 */
export const OPENTHROTTLE_CORTEX_POSTGRES_URL_ENV = `OPENTHROTTLE_CORTEX_POSTGRES_URL`;

/**
 * @description When set (non-empty after trim) on the BullMQ worker, nested `workflow-ralph` children receive this as `HOME` so Claude Code and similar CLIs resolve OAuth paths under a directory you control (e.g. bind-mount host credentials into `/var/ralph-home` and set this to that path).
 */
export const WORKFLOW_RALPH_SPAWN_HOME_ENV = `WORKFLOW_RALPH_SPAWN_HOME`;

/**
 * @description When set on the worker, nested Ralph children receive this as `XDG_CONFIG_HOME` for tools that read config from XDG paths instead of `HOME` alone.
 */
export const WORKFLOW_RALPH_SPAWN_XDG_CONFIG_HOME_ENV = `WORKFLOW_RALPH_SPAWN_XDG_CONFIG_HOME`;

/**
 * @description Explicit absolute path to the OpenThrottle monorepo root, used to locate the `workflow-ralph` binary (`<root>/node_modules/.bin`) so nested spawns resolve it deterministically — even when `cwd` is a foreign checkout and the dev shell PATH is not inherited (clean/Docker envs). Set this when the marker file (`pnpm-workspace.yaml`) is not reachable by walking up from the module or `cwd`.
 */
export const WORKFLOW_RALPH_OT_ROOT_ENV = `WORKFLOW_RALPH_OT_ROOT`;

/** Marker file that identifies the OpenThrottle monorepo (pnpm workspace) root. */
const OT_WORKSPACE_MARKER = `pnpm-workspace.yaml`;

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
 * @description Returns true when `dir` contains the OpenThrottle workspace marker ({@link OT_WORKSPACE_MARKER}).
 */
const hasWorkspaceMarker = (dir: string): boolean =>
  fs.existsSync(path.join(dir, OT_WORKSPACE_MARKER));

/**
 * @description Walks up from `startDir` to find the OpenThrottle monorepo root (the first ancestor containing {@link OT_WORKSPACE_MARKER}). Returns undefined when no marker is found. Never throws.
 */
const walkUpForWorkspaceRoot = (startDir: string): string | undefined => {
  let dir: string;
  try {
    dir = path.resolve(startDir);
  } catch {
    return undefined;
  }

  for (;;) {
    if (hasWorkspaceMarker(dir)) {
      return dir;
    }
    const parent = path.dirname(dir);
    if (parent === dir) {
      return undefined;
    }
    dir = parent;
  }
};

/**
 * @description Returns the directory of this module, or undefined when it cannot be resolved.
 * Walking up from here lands in the OpenThrottle monorepo regardless of `cwd`.
 *
 * The cross-repo spawn/Nx consumers of this code (`@tools/workflows`, `openthrottle-server`)
 * are compiled and run under CommonJS, where `__dirname` is the file's directory. We resolve
 * via `__dirname` (guarded with `typeof`) rather than `import.meta.url` so this file also
 * compiles under the CommonJS `module` setting those projects use — `import.meta` is rejected
 * there (TS1343). Under native ESM (`__dirname` undefined) this returns undefined and callers
 * fall back to the `WORKSPACE_ROOT`/`cwd` strategies.
 */
const getModuleDir = (): string | undefined =>
  typeof __dirname === 'string' ? __dirname : undefined;

/**
 * @description Resolves the OpenThrottle monorepo root, in priority order:
 * 1. {@link WORKFLOW_RALPH_OT_ROOT_ENV} (explicit; trusted when the directory exists),
 * 2. `WORKSPACE_ROOT` (when it contains {@link OT_WORKSPACE_MARKER}),
 * 3. walk up from this module's location (always inside OpenThrottle),
 * 4. walk up from `process.cwd()` (last resort).
 * @returns Absolute path to the OpenThrottle root, or undefined when it cannot be determined.
 */
export const resolveOpenThrottleRoot = (
  env: NodeJS.ProcessEnv = process.env,
): string | undefined => {
  const explicit = env[WORKFLOW_RALPH_OT_ROOT_ENV]?.trim();
  if (explicit && isDirectory(explicit)) {
    return explicit;
  }

  const workspaceRoot = env.WORKSPACE_ROOT?.trim();
  if (workspaceRoot && hasWorkspaceMarker(workspaceRoot)) {
    return workspaceRoot;
  }

  const moduleDir = getModuleDir();
  if (moduleDir) {
    const fromModule = walkUpForWorkspaceRoot(moduleDir);
    if (fromModule) {
      return fromModule;
    }
  }

  return walkUpForWorkspaceRoot(process.cwd());
};

/**
 * @description Resolves the OpenThrottle `node_modules/.bin` directory that contains the `workflow-ralph` binary, using {@link resolveOpenThrottleRoot}. Returns undefined when the root or bin directory cannot be found, so callers can leave PATH untouched.
 */
export const resolveWorkflowRalphBinDir = (
  env: NodeJS.ProcessEnv = process.env,
): string | undefined => {
  const root = resolveOpenThrottleRoot(env);
  if (!root) {
    return undefined;
  }

  const binDir = path.join(root, 'node_modules', '.bin');
  return isDirectory(binDir) ? binDir : undefined;
};

/**
 * @description Returns a copy of `env` with `dir` prepended to PATH. Returns `env` unchanged when `dir` is already on PATH so resolution stays idempotent.
 */
const prependDirToPath = (
  env: NodeJS.ProcessEnv,
  dir: string,
): NodeJS.ProcessEnv => {
  const currentPath = env.PATH ?? '';
  const parts = currentPath.split(path.delimiter).filter((p) => p.length > 0);
  if (parts.includes(dir)) {
    return env;
  }

  const nextPath =
    currentPath.length > 0 ? `${dir}${path.delimiter}${currentPath}` : dir;

  return { ...env, PATH: nextPath };
};

/**
 * @description Prepends the OpenThrottle `node_modules/.bin` directory ({@link resolveWorkflowRalphBinDir}) to PATH so `pnpm exec workflow-ralph` resolves the binary from the OpenThrottle monorepo regardless of `cwd`, without relying on the dev shell PATH bleeding in. No-op when the bin directory cannot be resolved or is already on PATH.
 */
export const applyWorkflowRalphBinPath = (
  env: NodeJS.ProcessEnv,
): NodeJS.ProcessEnv => {
  const binDir = resolveWorkflowRalphBinDir(env);
  if (binDir === undefined) {
    return env;
  }

  return prependDirToPath(env, binDir);
};

/**
 * @description Resolves Cortex Postgres URL from env. Prefer {@link OPENTHROTTLE_CORTEX_POSTGRES_URL_ENV} (injected at spawn), then `POSTGRES_URL`, then `POSTGRES_*` pieces.
 * @returns Connection string or `undefined` when required vars are missing.
 */
export function resolveCortexPostgresConnectionStringFromEnv(
  env: NodeJS.ProcessEnv = process.env,
): string | undefined {
  const ot = env[OPENTHROTTLE_CORTEX_POSTGRES_URL_ENV]?.trim();
  if (ot) {
    return ot;
  }

  const url = env.POSTGRES_URL?.trim();
  if (url) {
    return url;
  }

  const db = env.POSTGRES_DB;
  const host = env.POSTGRES_HOST;
  const password = env.POSTGRES_PASSWORD;
  const port = Number(env.POSTGRES_PORT);
  const user = env.POSTGRES_USER;

  if (!db || !host || !password || !port || !user) {
    return undefined;
  }

  const encodedPassword = encodeURIComponent(password);
  return `postgresql://${user}:${encodedPassword}@${host}:${port}/${db}`;
}

/**
 * @description Applies optional identity overrides from {@link WORKFLOW_RALPH_SPAWN_HOME_ENV} and {@link WORKFLOW_RALPH_SPAWN_XDG_CONFIG_HOME_ENV} so queue workers can align nested CLIs with mounted credentials.
 */
export function applyWorkflowRalphSpawnIdentityOverrides(
  env: NodeJS.ProcessEnv,
): NodeJS.ProcessEnv {
  const home = env[WORKFLOW_RALPH_SPAWN_HOME_ENV]?.trim();
  const xdgConfigHome = env[WORKFLOW_RALPH_SPAWN_XDG_CONFIG_HOME_ENV]?.trim();

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
}

/** Env var: `graphql` (default) or `postgres-direct` for Ralph plan/task I/O rollback. */
export const WORKFLOW_RALPH_TRANSPORT_ENV = `WORKFLOW_RALPH_TRANSPORT`;

const resolveWorkflowRalphTransportFromSpawnEnv = (
  env: NodeJS.ProcessEnv,
): 'graphql' | 'postgres-direct' => {
  const raw = env[WORKFLOW_RALPH_TRANSPORT_ENV]?.trim().toLowerCase();

  if (raw === 'postgres-direct' || raw === 'postgres') {
    return 'postgres-direct';
  }

  return 'graphql';
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
 * @description Env passed to nested `pnpm exec workflow-ralph`: GraphQL auth/URL (default) or canonical Postgres URL (rollback), plus PATH with OpenThrottle `node_modules/.bin` for deterministic `workflow-ralph` resolution from a foreign `cwd` (see {@link applyWorkflowRalphBinPath}).
 */
export function buildWorkflowRalphSpawnEnv(
  workerEnv: NodeJS.ProcessEnv,
  options?: BuildWorkflowRalphSpawnEnvOptions,
): NodeJS.ProcessEnv {
  const transport = resolveWorkflowRalphTransportFromSpawnEnv(workerEnv);
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
        [OPENTHROTTLE_CORTEX_POSTGRES_URL_ENV]: conn,
        POSTGRES_URL: conn,
      };
    }
  }

  const withBinPath = applyWorkflowRalphBinPath(env);

  return applyWorkflowRalphSpawnIdentityOverrides(withBinPath);
}

/**
 * @description Returns Cortex Postgres connection string from POSTGRES_URL or POSTGRES_* env vars.
 * @returns Connection config or undefined if not configured.
 */
export function getPostgresConfig(): CortexPostgresConfig {
  const resolved = resolveCortexPostgresConnectionStringFromEnv();
  if (!resolved) {
    const message = `🚨 Postgres database is unreachable. Set POSTGRES_URL or POSTGRES_* env vars.`;
    throw new Error(message);
  }

  return { connectionString: resolved };
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
