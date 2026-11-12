/**
 * @description Single-iteration runner for Ralph (sync and async). Injected by ralph.ts so tests can mock it.
 * Thin adapter over `@openthrottle/openthrottle-drivers`: resolves the backend from the driver registry
 * and delegates to the shared execution engine (`runDriverSync` / `runDriverAsync`), wiring the Ralph
 * debug logger in as the injected logger. All shell-command building, escaping, and process handling now
 * live in the drivers package.
 */

import type { TrajectoryRecord } from '@openthrottle/openthrottle-agentic-utils';
import {
  buildTrajectoryRecord,
  DEFAULT_WORKFLOW_RUNNER,
  resolveHookPluginDirs,
  withStructuredOutput,
} from '@openthrottle/openthrottle-agentic-utils';
import type { WorkflowConfigRunner } from '@openthrottle/openthrottle-agentic-workflow';
import type {
  AgentDriver,
  DriverChunk,
  DriverInvocationConfig,
  DriverRawOutput,
  DriverReasoningEffort,
  DriverWorktreeOptions,
  UsageLimit,
} from '@openthrottle/openthrottle-drivers';
import {
  getDriver,
  runDriverAsync,
  runDriverSync,
} from '@openthrottle/openthrottle-drivers';

import { ARTWORK_LINE, COLORS } from '../config/index';
import { resolveAgentVersion } from '../utils/agent-version';
import { ralphDebugLogger } from '../utils/ralph-debug-logger';
import type { RalphWorktreeCliOptions } from '../utils/ralph-worktree-cli';

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
  /**
   * Reasoning effort, mapped per backend by the drivers' shared helpers (claude `--effort`, codex
   * `-c model_reasoning_effort=`, grok `--reasoning-effort`, opencode `--variant`). Backends with no
   * reasoning knob (cursor, antigravity) ignore it.
   */
  effort?: DriverReasoningEffort;
  /** Extra env for the runner subprocess, merged over `process.env` (e.g. `OT_PR_DRAFT_DIR`). */
  env?: Readonly<Record<string, string>>;
  /** Iteration number. */
  iteration: number;
  /** Model preset when the backend supports it (Cursor: `--model`; Claude Code: `--model`). */
  model?: string;
  /** Optional callback for each stdout/stderr chunk (async path only). */
  onChunk?: (chunk: CursorAgentChunk) => void;
  /**
   * Async path only: receives the iteration's run transcript (an ATIF trajectory, capped for
   * transport) once the agent has stopped, however it stopped. Capture is fail-open — a throw or
   * rejection here is logged and never fails the iteration. Not called when the agent printed no
   * structured events at all (it failed before starting).
   */
  onTrajectory?: (record: TrajectoryRecord) => void | Promise<void>;
  /**
   * Optional callback fired when the iteration closes normally and the driver detected a
   * subscription usage limit (Claude `stream-json` only). Sync and async paths; does not change the
   * returned string. Not fired on timeout, abort or spawn failure.
   */
  onUsageLimit?: (usageLimit: UsageLimit) => void;
  /** Optional AbortSignal to cancel the iteration (async path only). */
  signal?: AbortSignal;
  /** Cursor-only: `--skip-worktree-setup`. */
  skipWorktreeSetup?: boolean;
  /** Optional per-iteration timeout in ms (async path only). On expiry, child is killed (SIGTERM then SIGKILL). */
  timeoutMs?: number;
  /**
   * Run facts recorded under the trajectory's `extra.openthrottle` (plan, run and task ids) — the
   * iteration knows only its own number.
   */
  trajectoryFacts?: Readonly<Record<string, unknown>>;
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
  driver: AgentDriver,
): DriverInvocationConfig => {
  return {
    cwd: config.cwd,
    effort: config.effort,
    env: config.env,
    iteration: config.iteration,
    model: config.model,
    onChunk: config.onChunk,
    // Leg B of the child-repo hook overlay: drivers that advertise `pluginDir` load OT's hook
    // payload out-of-repo, so a run in a foreign checkout is observed without a byte being written
    // into it. Resolution is fail-open — an empty list emits no flag — and gated by
    // OPENTHROTTLE_HOOK_PLUGIN_ENABLED. Drivers without the capability ignore this outright.
    // The payload is per-driver: a plugin's hook config names one tool's events, so pointing a
    // CLI at another tool's payload loads cleanly and records nothing.
    pluginDirs: resolveHookPluginDirs(
      driver.pluginDirRel === undefined
        ? {}
        : { payloadRel: driver.pluginDirRel },
    ),
    prompt: config.agentPrompt,
    signal: config.signal,
    timeoutMs: config.timeoutMs,
    worktree: toWorktreeOptions(config),
  };
};

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

  return runDriverSync(driver, toDriverConfig(config, driver), {
    logger: ralphDebugLogger,
    onUsageLimit: config.onUsageLimit,
  });
};

const outcomeOf = (raw: DriverRawOutput): string => {
  if (raw.termination !== 'exited') {
    return raw.termination;
  }

  return raw.exitCode === 0 ? 'succeeded' : 'failed';
};

/**
 * @description Builds and hands over the iteration's trajectory. Never throws: a capture failure
 * is a missing transcript, not a failed iteration.
 */
const captureTrajectory = async (
  config: RunIterationConfig,
  driver: AgentDriver,
  raw: DriverRawOutput,
): Promise<void> => {
  const { onTrajectory } = config;

  if (onTrajectory === undefined) {
    return;
  }

  try {
    const record = buildTrajectoryRecord({
      agentVersion: resolveAgentVersion(driver),
      driverId: driver.id,
      durationMs: raw.durationMs,
      exitCode: raw.exitCode,
      model: config.model,
      openthrottle: { ...config.trajectoryFacts, iteration: config.iteration },
      outcome: outcomeOf(raw),
      prompt: config.agentPrompt,
      rawStdout: raw.stdout,
      reportsToolCalls: driver.capabilities.reportsToolCalls,
    });

    if (record !== undefined) {
      await onTrajectory(record);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    console.warn(
      `⚠️ Could not record the iteration ${config.iteration} trajectory: ${message}`,
    );
  }
};

/**
 * @description Executes a single iteration using spawn + Promise. Use when non-interactive for
 * streaming and per-iteration timeout/cancel. The agent runs in its CLI's structured output mode
 * (rendered back to prose for the stream and the returned text), which is what lets
 * `onTrajectory` receive a transcript.
 */
export const runIterationAsync = async (
  config: RunIterationConfig,
): Promise<string> => {
  const { backend = DEFAULT_WORKFLOW_RUNNER, iteration } = config;
  logIterationBanner(iteration);

  const driver = withStructuredOutput(getDriver(backend));
  const rawOutput: { current: DriverRawOutput | undefined } = {
    current: undefined,
  };

  const output = await runDriverAsync(driver, toDriverConfig(config, driver), {
    logger: ralphDebugLogger,
    onRawOutput: (raw) => {
      rawOutput.current = raw;
    },
    onUsageLimit: config.onUsageLimit,
  });

  if (rawOutput.current !== undefined) {
    await captureTrajectory(config, driver, rawOutput.current);
  }

  return output;
};
