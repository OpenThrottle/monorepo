import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

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
 * Supports CommonJS (`__dirname`) and native ESM (`import.meta.url`) so consumers compiled
 * under either module system can use module walk-up.
 */
const getModuleDir = (): string | undefined => {
  if (typeof __dirname === 'string') {
    return __dirname;
  }

  try {
    return path.dirname(fileURLToPath(import.meta.url));
  } catch {
    return undefined;
  }
};

/**
 * @description Resolves the OpenThrottle monorepo root, in priority order:
 * 1. {@link WORKFLOW_RALPH_OT_ROOT_ENV} (explicit; trusted when the directory exists),
 * 2. `WORKSPACE_ROOT` (when it contains {@link OT_WORKSPACE_MARKER}),
 * 3. walk up from this module's location (always inside OpenThrottle),
 * 4. walk up from `process.cwd()` (last resort).
 * @returns Absolute path to the OpenThrottle root, or undefined when it cannot be determined.
 */
export function getOpenThrottleRoot(
  env: NodeJS.ProcessEnv = process.env,
): string | undefined {
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
}

/**
 * @description Resolves the directory used to load `.workflow-ralph.json` and workflow tuning defaults.
 * Priority: job worktree (`workingDirectory`), then `WORKSPACE_ROOT`, then `process.cwd()`.
 */
export function getWorkflowConfigCwd(
  workingDirectory: string | undefined,
  env: NodeJS.ProcessEnv = process.env,
): string {
  const fromJob = workingDirectory?.trim();
  if (fromJob !== undefined && fromJob !== '') {
    return fromJob;
  }

  const workspaceRoot = env.WORKSPACE_ROOT?.trim();
  if (workspaceRoot !== undefined && workspaceRoot !== '') {
    return workspaceRoot;
  }

  return process.cwd();
}

/** Primary env var for Ralph workflow debug output (stderr). */
export const WORKFLOW_RALPH_DEBUG_ENV = `WORKFLOW_RALPH_DEBUG` as const;

/** Legacy alias for {@link WORKFLOW_RALPH_DEBUG_ENV}. */
export const WORKFLOW_RALPH_DEBUG_LEGACY_ENV = `RALPH_DEBUG` as const;

/**
 * When set, enables the noisiest debug lines (also accepts
 * `WORKFLOW_RALPH_DEBUG=2|verbose|all`).
 */
export const WORKFLOW_RALPH_VERBOSE_ENV = `WORKFLOW_RALPH_VERBOSE` as const;

/** @description Opt-in workflow/Ralph debug shim level parsed from env (no logger instance). */
export type WorkflowDebugLevel = `off` | `debug` | `verbose`;

/**
 * @description Returns true when `WORKFLOW_RALPH_VERBOSE` (or equivalent) requests verbose lines.
 */
export const isWorkflowVerboseEnvTruthy = (
  value: string | undefined,
): boolean => {
  if (value === undefined || value === ``) {
    return false;
  }
  const s = value.trim().toLowerCase();
  return (
    s === `1` || s === `true` || s === `yes` || s === `on` || s === `verbose`
  );
};

/**
 * @description Reads workflow debug level from env (`WORKFLOW_RALPH_DEBUG`, `RALPH_DEBUG`, `WORKFLOW_RALPH_VERBOSE`). Pure; no I/O.
 */
export const readWorkflowDebugLevelFromEnv = (
  env: NodeJS.ProcessEnv = process.env,
): WorkflowDebugLevel => {
  const verboseRaw = env[WORKFLOW_RALPH_VERBOSE_ENV];
  if (isWorkflowVerboseEnvTruthy(verboseRaw)) {
    return `verbose`;
  }

  const raw =
    env[WORKFLOW_RALPH_DEBUG_ENV] ?? env[WORKFLOW_RALPH_DEBUG_LEGACY_ENV];
  if (raw === undefined || raw === ``) {
    return `off`;
  }

  const s = raw.trim().toLowerCase();
  if (s === `` || s === `0` || s === `false` || s === `off` || s === `no`) {
    return `off`;
  }
  if (s === `2` || s === `verbose` || s === `all`) {
    return `verbose`;
  }

  return `debug`;
};
