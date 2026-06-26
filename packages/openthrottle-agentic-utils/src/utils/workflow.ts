import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  DEFAULT_WORKFLOW_RUNNER,
  WORKFLOW_RALPH_DEBUG_ENV,
  WORKFLOW_RALPH_DEBUG_LEGACY_ENV,
  WORKFLOW_RALPH_OT_ROOT_ENV,
  WORKFLOW_RALPH_VERBOSE_ENV,
  WORKFLOW_RUNNER_IDS,
} from '../config/index.ts';
import { toContainerPath } from './workspace-paths.ts';

/**
 * Marker file that identifies the OpenThrottle monorepo (pnpm workspace) root.
 *
 * Exported so docs and call sites reference the single source of truth rather
 * than re-typing the literal (which previously drifted to `pnpm-workspace.yaml`).
 *
 * @publicApi
 */
export const OPENTHROTTLE_WORKSPACE_MARKER = `.openthrottle.mjs`;

/**
 * Returns true when `dir` exists and is a directory. Never throws.
 */
const isDirectory = (dir: string): boolean => {
  try {
    return fs.statSync(dir).isDirectory();
  } catch {
    return false;
  }
};

/**
 * Returns true when `dir` contains the OpenThrottle workspace marker ({@link OPENTHROTTLE_WORKSPACE_MARKER}).
 */
const hasWorkspaceMarker = (dir: string): boolean => {
  return fs.existsSync(path.join(dir, OPENTHROTTLE_WORKSPACE_MARKER));
};

/**
 * Walks up from `startDir` to find the OpenThrottle monorepo root (the first ancestor containing {@link OPENTHROTTLE_WORKSPACE_MARKER}).
 * Returns undefined when no marker is found. Never throws.
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
 * Reads `import.meta.url` at runtime without a static `import.meta` reference so
 * CommonJS-compiling consumers (e.g. NestJS packages) do not require ESM module settings.
 */
const readImportMetaUrl = (): string | undefined => {
  try {
    return new Function('return import.meta.url')();
  } catch {
    return undefined;
  }
};

/**
 * Returns the directory of this module, or undefined when it cannot be resolved.
 * Walking up from here lands in the OpenThrottle monorepo regardless of `cwd`.
 *
 * Supports CommonJS (`__dirname`) and native ESM (`import.meta.url`) so consumers compiled
 * under either module system can use module walk-up.
 */
const getModuleDir = (): string | undefined => {
  if (typeof __dirname === 'string') {
    return __dirname;
  }

  const importMetaUrl = readImportMetaUrl();
  if (importMetaUrl === undefined) {
    return undefined;
  }

  try {
    return path.dirname(fileURLToPath(importMetaUrl));
  } catch {
    return undefined;
  }
};

/**
 * Resolves the OpenThrottle monorepo root, in priority order:
 *
 * 1. {@link WORKFLOW_RALPH_OT_ROOT_ENV} (explicit; trusted when the directory exists),
 * 2. `WORKSPACE_ROOT` (when it contains {@link OPENTHROTTLE_WORKSPACE_MARKER}),
 * 3. walk up from this module's location (always inside OpenThrottle),
 * 4. walk up from `process.cwd()` (last resort).
 *
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
 * Resolves the directory used to load `.workflow-ralph.json` and workflow tuning defaults.
 * Priority: job worktree (`workingDirectory`), then `WORKSPACE_ROOT`, then `process.cwd()`.
 */
export function getWorkflowConfigCwd(
  workingDirectory: string | undefined,
  env: NodeJS.ProcessEnv = process.env,
): string {
  // Job data stores host-truthful paths; the bridge mapping (identity outside
  // Docker) translates them to where the workspace mount lives in this process.
  const fromJob = workingDirectory?.trim();
  if (fromJob !== undefined && fromJob !== '') {
    return toContainerPath(fromJob, env);
  }

  const workspaceRoot = env.WORKSPACE_ROOT?.trim();
  if (workspaceRoot !== undefined && workspaceRoot !== '') {
    return toContainerPath(workspaceRoot, env);
  }

  return process.cwd();
}

/**
 * Opt-in workflow/Ralph debug shim level parsed from env (no logger instance).
 */
export type WorkflowDebugLevel = `off` | `debug` | `verbose`;

/**
 * Returns true when `WORKFLOW_RALPH_VERBOSE` (or equivalent) requests verbose lines.
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
 * Reads workflow debug level from env (`WORKFLOW_RALPH_DEBUG`, `RALPH_DEBUG`, `WORKFLOW_RALPH_VERBOSE`). Pure; no I/O.
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

/**
 * Which CLI/process runs each agentic iteration.
 */
export type WorkflowRunnerId = (typeof WORKFLOW_RUNNER_IDS)[number];

/**
 * Returns true when `value` is a supported {@link WorkflowRunnerId}.
 */
export const isWorkflowRunnerId = (
  value: string,
): value is WorkflowRunnerId => {
  return (WORKFLOW_RUNNER_IDS as readonly string[]).includes(value);
};

/**
 * Normalizes and validates a runner id from CLI, env, or defaults file.
 */
export const parseWorkflowRunnerId = (
  raw: string,
  source: `cli` | `env` | `file` = `cli`,
): WorkflowRunnerId => {
  const normalized = raw.trim().toLowerCase();
  if (normalized === ``) {
    throw new Error(
      `Execution backend (${source}) must be a non-empty string (e.g. ${DEFAULT_WORKFLOW_RUNNER})`,
    );
  }

  if (!isWorkflowRunnerId(normalized)) {
    throw new Error(
      `Unknown execution backend "${raw.trim()}". Supported: ${WORKFLOW_RUNNER_IDS.join(', ')}`,
    );
  }

  return normalized;
};
