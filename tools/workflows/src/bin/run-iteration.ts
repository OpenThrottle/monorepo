/**
 * @description Single-iteration runner for Ralph (sync and async). Injected by ralph.ts so tests can mock it.
 * Thin adapter over `@openthrottle/openthrottle-drivers`: resolves the backend from the driver registry
 * and delegates to the shared execution engine (`runDriverSync` / `runDriverAsync`), wiring the Ralph
 * debug logger in as the injected logger. All shell-command building, escaping, and process handling now
 * live in the drivers package.
 */

import {
  getDriver,
  runDriverAsync,
  runDriverSync,
} from '@openthrottle/openthrottle-drivers';
import type {
  DriverChunk,
  DriverInvocationConfig,
  DriverWorktreeOptions,
} from '@openthrottle/openthrottle-drivers';
import { ARTWORK_LINE, COLORS } from '../config/index';
import {
  DEFAULT_WORKFLOW_RUNNER,
  resolveHookPluginDirs,
} from '@openthrottle/openthrottle-agentic-utils';
import { ralphDebugLogger } from '../utils/ralph-debug-logger';
import type { RalphWorktreeCliOptions } from '../utils/ralph-worktree-cli';
import { WorkflowConfigRunner } from '@openthrottle/openthrottle-agentic-workflow';

/**
 * @description Chunk from runner stdout or stderr when using async spawn.
 * @deprecated Use `DriverChunk` from `@openthrottle/openthrottle-drivers`.
 */
export type CursorAgentChunk = DriverChunk;

export interface RunIterationConfig {
  /** Full prompt for the runner (e.g. Cursor `-p`); includes injected plan/tasks and Plan-Id (and optional Task-Id). */
  agentPrompt: string;
  /** @description Execution backend; defaults to {@link DEFAULT_WORKFLOW_RUNNER}. */
  backend?: WorkflowConfigRunner;
  /**
   * @description Process cwd for the runner subprocess. When omitted, inherits `process.cwd()`
   * (e.g. foreign `workingDirectory` from BullMQ spawn or orchestrator).
   */
  cwd?: string;
  /** Iteration number. */
  iteration: number;
  /** Model preset when the backend supports it (Cursor: `--model`; Claude Code: `--model`). */
  model?: string;
  /** Optional callback for each stdout/stderr chunk (async path only). */
  onChunk?: (chunk: CursorAgentChunk) => void;
  /** Optional AbortSignal to cancel the iteration (async path only). */
  signal?: AbortSignal;
  /** Cursor-only: `--skip-worktree-setup`. */
  skipWorktreeSetup?: boolean;
  /** Optional per-iteration timeout in ms (async path only). On expiry, child is killed (SIGTERM then SIGKILL). */
  timeoutMs?: number;
  /** Agent CLI worktree (`-w` / `--worktree`); see `docs/workflows/ralph-worktree-flag.md`. */
  worktree?: RalphWorktreeCliOptions['worktree'];
  /** Cursor-only: `--worktree-base`. */
  worktreeBase?: string;
}

/**
 * @description Maps Ralph's flat worktree fields onto the drivers package's grouped
 * {@link DriverWorktreeOptions}. Returns undefined when no worktree is configured (so drivers emit
 * no `-w` flag), matching the legacy `appendRalphWorktreeShellFlags` behavior.
 */
const toWorktreeOptions = (
  config: RunIterationConfig,
): DriverWorktreeOptions | undefined => {
  if (config.worktree === undefined) {
    return undefined;
  }

  return {
    skipWorktreeSetup: config.skipWorktreeSetup,
    worktree: config.worktree,
    worktreeBase: config.worktreeBase,
  };
};

/**
 * @description Maps a Ralph {@link RunIterationConfig} onto the driver-agnostic
 * {@link DriverInvocationConfig}.
 */
const toDriverConfig = (
  config: RunIterationConfig,
): DriverInvocationConfig => ({
  cwd: config.cwd,
  iteration: config.iteration,
  model: config.model,
  onChunk: config.onChunk,
  // Leg B of the child-repo hook overlay: drivers that advertise `pluginDir` load OT's hook
  // payload out-of-repo, so a run in a foreign checkout is observed without a byte being written
  // into it. Resolution is fail-open — an empty list emits no flag — and gated by
  // OPENTHROTTLE_HOOK_PLUGIN_ENABLED. Drivers without the capability ignore this outright.
  pluginDirs: resolveHookPluginDirs(),
  prompt: config.agentPrompt,
  signal: config.signal,
  timeoutMs: config.timeoutMs,
  worktree: toWorktreeOptions(config),
});

const logIterationBanner = (iteration: number): void => {
  console.log(`\n${ARTWORK_LINE}\n`);
  console.log(
    `🤖 Running iteration ${COLORS.green}${iteration}${COLORS.reset}\n`,
  );
};

/**
 * @description Executes a single iteration of the agentic process (sync). Use when running interactively (TTY).
 */
export const runIteration = (config: RunIterationConfig): string => {
  const { backend = DEFAULT_WORKFLOW_RUNNER, iteration } = config;
  logIterationBanner(iteration);

  const driver = getDriver(backend);

  return runDriverSync(driver, toDriverConfig(config), {
    logger: ralphDebugLogger,
  });
};

/**
 * @description Executes a single iteration using spawn + Promise. Use when non-interactive for streaming and per-iteration timeout/cancel.
 */
export const runIterationAsync = (
  config: RunIterationConfig,
): Promise<string> => {
  const { backend = DEFAULT_WORKFLOW_RUNNER, iteration } = config;
  logIterationBanner(iteration);

  const driver = getDriver(backend);

  return runDriverAsync(driver, toDriverConfig(config), {
    logger: ralphDebugLogger,
  });
};
