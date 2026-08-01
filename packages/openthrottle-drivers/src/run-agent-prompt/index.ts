/**
 * @description The single provider-agnostic "run one prompt once" entrypoint. Resolves a driver from
 * an id, validates that requested tuning knobs are supported (typed errors, never silent drops), runs
 * the prompt through the async engine, and returns a structured {@link RunAgentPromptResult} that
 * classifies the engine's merged-string + `<promise>ERROR</promise>` sentinel convention into an
 * explicit status (including a `failed` state for non-zero exits, which the raw engine string hides).
 *
 * This is the choke point the server calls for any of the five agent CLIs — no invocation logic
 * (driver resolution, command building, spawn) should leak into consumers.
 */

import { getDriver } from '../drivers/index.ts';
import { runDriverAsync } from '../engine/index.ts';
import type { RunDriverOptions } from '../engine/index.ts';
import { DriverCapabilityError } from '../errors/index.ts';
import { parseDriverId } from '../registry/index.ts';
import type { DriverId } from '../registry/index.ts';
import type {
  DriverChunk,
  DriverEndpointConfig,
  DriverInvocationConfig,
  DriverWorktreeOptions,
} from '../types/index.ts';

/**
 * @description The typed subset of driver tuning knobs a generic caller may set. Deliberately NOT a
 * free-form flag bag — the driver contract has no arbitrary-flags path, so only `endpoint` and
 * `worktree` (the real knobs beyond `model`, which stays a first-class field on
 * {@link RunAgentPromptConfig}) are honored. Unknown keys are a validation concern for the caller.
 * @public
 */
export interface AgentPromptSettings {
  /** Local OpenAI-compatible endpoint; honored only by drivers with `supportsCustomBaseUrl`. */
  readonly endpoint?: DriverEndpointConfig;
  /** Worktree flags; honored only by drivers with the matching `worktree` capabilities. */
  readonly worktree?: DriverWorktreeOptions;
}

/**
 * @description Provider-agnostic input for {@link runAgentPrompt}. `driverId` is a raw string
 * validated via `parseDriverId`; the rest map directly onto {@link DriverInvocationConfig}.
 * @public
 */
export interface RunAgentPromptConfig {
  /** Process cwd for the subprocess; inherits `process.cwd()` when omitted. */
  readonly cwd?: string;
  /** Raw driver id; validated via `parseDriverId` (throws `UnknownDriverError` when unknown). */
  readonly driverId: string;
  /** Model preset; requires the driver to advertise `supportsModelFlag`. */
  readonly model?: string;
  /** Per-chunk stdout/stderr callback; wrapped internally so `output` is always buffered. */
  readonly onChunk?: (chunk: DriverChunk) => void;
  /** Full prompt passed to the CLI's print/headless mode. */
  readonly prompt: string;
  /** Typed tuning-knob subset (endpoint/worktree). */
  readonly settings?: AgentPromptSettings;
  /** AbortSignal to cancel the invocation. */
  readonly signal?: AbortSignal;
  /** Per-invocation timeout in ms; on expiry the child is SIGTERM→SIGKILL'd. */
  readonly timeoutMs?: number;
}

/**
 * @description Terminal status of a single prompt run.
 * - `ok` — process exited 0.
 * - `failed` — process exited non-zero.
 * - `timeout` — killed after `timeoutMs`.
 * - `cancelled` — killed via `signal`.
 * - `spawn_error` — the child never started (spawn failure).
 * @public
 */
export const RUN_AGENT_STATUS = {
  cancelled: 'cancelled',
  failed: 'failed',
  ok: 'ok',
  spawnError: 'spawn_error',
  timeout: 'timeout',
} as const;

/** @description One of the {@link RUN_AGENT_STATUS} values. @public */
export type RunAgentStatus =
  (typeof RUN_AGENT_STATUS)[keyof typeof RUN_AGENT_STATUS];

/**
 * @description Structured result of {@link runAgentPrompt}. `output` is buffered by `runAgentPrompt`
 * itself (wrapping the caller's `onChunk`), so partial output survives a timeout/cancel — the engine
 * discards its own buffer on those paths. `exitCode` is `null` for any non-`ok`/`failed` status.
 * @public
 */
export interface RunAgentPromptResult {
  readonly driverId: DriverId;
  readonly exitCode: number | null;
  readonly model?: string;
  readonly output: string;
  readonly status: RunAgentStatus;
}

/**
 * @description Runs one prompt through one driver and returns a typed result. Resolves the driver via
 * `getDriver(parseDriverId(...))`, rejects capability mismatches with {@link DriverCapabilityError},
 * and classifies the outcome:
 *
 * 1. A thrown child spawn error ⇒ `spawn_error`.
 * 2. Otherwise, if the engine reported a normal close (`onExit` fired) ⇒ `ok` (exit 0) or `failed`.
 * 3. Otherwise the run was killed: `cancelled` when `signal.aborted`, else `timeout`.
 *
 * Never throws for timeout/abort/non-zero exit — those are results, not exceptions. Only invalid
 * input (unknown driver id, capability mismatch) throws.
 * @public
 */
export const runAgentPrompt = async (
  config: RunAgentPromptConfig,
  options: RunDriverOptions = {},
): Promise<RunAgentPromptResult> => {
  const driverId = parseDriverId(config.driverId);
  const driver = getDriver(driverId);
  const { endpoint, worktree } = config.settings ?? {};

  const model = config.model?.trim();
  if (model && !driver.capabilities.supportsModelFlag) {
    throw new DriverCapabilityError(
      driverId,
      'a model flag',
      `cannot apply model "${model}"`,
    );
  }

  if (endpoint && !driver.capabilities.supportsCustomBaseUrl) {
    throw new DriverCapabilityError(
      driverId,
      'a custom endpoint',
      `cannot target base URL "${endpoint.baseUrl}"`,
    );
  }

  if (worktree && !driver.capabilities.worktree) {
    throw new DriverCapabilityError(
      driverId,
      'worktrees',
      'cannot apply worktree options',
    );
  }

  const buffered: string[] = [];
  const invocationConfig: DriverInvocationConfig = {
    cwd: config.cwd,
    endpoint,
    iteration: 0,
    model: config.model,
    onChunk: (chunk: DriverChunk): void => {
      buffered.push(chunk.data);
      config.onChunk?.(chunk);
    },
    prompt: config.prompt,
    signal: config.signal,
    timeoutMs: config.timeoutMs,
    worktree,
  };

  let exitCode: number | null = null;
  let exited = false;

  let status: RunAgentStatus;
  try {
    await runDriverAsync(driver, invocationConfig, {
      logger: options.logger,
      onExit: (code: number | null): void => {
        exited = true;
        exitCode = code;
      },
    });

    if (exited) {
      status = exitCode === 0 ? RUN_AGENT_STATUS.ok : RUN_AGENT_STATUS.failed;
    } else if (config.signal?.aborted) {
      status = RUN_AGENT_STATUS.cancelled;
    } else {
      status = RUN_AGENT_STATUS.timeout;
    }
  } catch {
    status = RUN_AGENT_STATUS.spawnError;
  }

  return {
    driverId,
    exitCode,
    model: config.model,
    output: buffered.join('').trim(),
    status,
  };
};
