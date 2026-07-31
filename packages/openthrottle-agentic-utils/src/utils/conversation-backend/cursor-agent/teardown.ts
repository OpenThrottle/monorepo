/**
 * Resource bounds + guaranteed teardown for spawned CLI agents. A spawned agent
 * is long-lived and unpredictable, so every run is bounded by an idle timeout
 * (no stdout for N ms) and a wall-clock cap, and is always torn down on
 * cancel/timeout/disconnect with a SIGTERM→SIGKILL escalation so no child is
 * left running (no zombies). All limits are env-overridable.
 */

import type { ChildProcess } from 'node:child_process';

/** Env override: idle (no-output) timeout in ms. */
export const AGENT_IDLE_TIMEOUT_MS_ENV = `OPENTHROTTLE_AGENT_IDLE_TIMEOUT_MS`;
/**
 * Env override: idle timeout in ms for the chat-stream orchestrator backstop
 * (`ConversationStreamService.runStream()`), independent of the per-agent knob.
 */
export const CHAT_IDLE_TIMEOUT_MS_ENV = 'OPENTHROTTLE_CHAT_IDLE_TIMEOUT_MS';
/** Env override: wall-clock timeout in ms. */
export const AGENT_WALLCLOCK_TIMEOUT_MS_ENV = `OPENTHROTTLE_AGENT_WALLCLOCK_TIMEOUT_MS`;
/** Env override: grace period before SIGKILL after SIGTERM, in ms. */
export const AGENT_KILL_GRACE_MS_ENV = 'OPENTHROTTLE_AGENT_KILL_GRACE_MS';
/** Env override: timeout for minting a CLI session (e.g. cursor create-chat), in ms. */
export const AGENT_SESSION_TIMEOUT_MS_ENV =
  'OPENTHROTTLE_AGENT_SESSION_TIMEOUT_MS';

const DEFAULT_IDLE_TIMEOUT_MS = 120_000;
const DEFAULT_WALLCLOCK_TIMEOUT_MS = 900_000;
const DEFAULT_KILL_GRACE_MS = 5_000;
const DEFAULT_SESSION_TIMEOUT_MS = 30_000;
/**
 * Margin added on top of the per-agent idle timeout when deriving the
 * chat-stream orchestrator backstop, so the CLI backends' own idle timeout +
 * SIGTERM→SIGKILL teardown gets to fire first and the orchestrator only catches
 * the pathological cases (a wedged HTTP endpoint, or a CLI that stalled without
 * emitting anything). Overridden wholesale by {@link CHAT_IDLE_TIMEOUT_MS_ENV}.
 */
const DEFAULT_CHAT_IDLE_MARGIN_MS = 30_000;

/** Resolved resource bounds for one spawned agent run. */
export interface AgentTimeouts {
  readonly graceMs: number;
  readonly idleMs: number;
  readonly wallClockMs: number;
}

function positiveIntOr(value: string | undefined, fallback: number): number {
  if (value === undefined) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);

  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

/**
 * Read the (env-overridable) timeouts; falls back to safe defaults.
 */
export function resolveAgentTimeouts(
  env: NodeJS.ProcessEnv = process.env,
): AgentTimeouts {
  return {
    graceMs: positiveIntOr(env[AGENT_KILL_GRACE_MS_ENV], DEFAULT_KILL_GRACE_MS),
    idleMs: positiveIntOr(
      env[AGENT_IDLE_TIMEOUT_MS_ENV],
      DEFAULT_IDLE_TIMEOUT_MS,
    ),
    wallClockMs: positiveIntOr(
      env[AGENT_WALLCLOCK_TIMEOUT_MS_ENV],
      DEFAULT_WALLCLOCK_TIMEOUT_MS,
    ),
  };
}

/**
 * Idle timeout (ms) for the chat-stream orchestrator backstop in
 * `ConversationStreamService.runStream()` — the single choke point that must
 * terminate ANY backend (including the otherwise-unbounded HTTP one) when no
 * chunk has arrived for this long.
 *
 * Reads {@link CHAT_IDLE_TIMEOUT_MS_ENV} when set to a positive integer;
 * otherwise derives `resolveAgentTimeouts().idleMs + DEFAULT_CHAT_IDLE_MARGIN_MS`
 * (default 150_000). The margin keeps this a true backstop that fires only after
 * the CLI backends' own idle timeout + teardown has had its chance, so their
 * cleaner self-terminated terminal chunk is preferred. Idle-only: the
 * orchestrator has no wall-clock cap (CLI backends keep their own).
 *
 * @public
 */
export function resolveChatIdleTimeoutMs(
  env: NodeJS.ProcessEnv = process.env,
): number {
  const override = env[CHAT_IDLE_TIMEOUT_MS_ENV];
  if (override !== undefined) {
    const parsed = Number.parseInt(override, 10);
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }

  return resolveAgentTimeouts(env).idleMs + DEFAULT_CHAT_IDLE_MARGIN_MS;
}

/**
 * Read the (env-overridable) timeout for minting a CLI session; safe default.
 */
export function resolveSessionCreateTimeoutMs(
  env: NodeJS.ProcessEnv = process.env,
): number {
  return positiveIntOr(
    env[AGENT_SESSION_TIMEOUT_MS_ENV],
    DEFAULT_SESSION_TIMEOUT_MS,
  );
}

/**
 * True once the child has exited (by code or signal).
 */
function hasExited(child: ChildProcess): boolean {
  return child.exitCode !== null || child.signalCode !== null;
}

/**
 * Terminate a child: SIGTERM now, then SIGKILL after `graceMs` if it has not
 * exited. No-op when the child has already exited. The grace timer is unref'd so
 * it never keeps the process alive, and cleared once the child closes.
 */
export function terminateChild(child: ChildProcess, graceMs: number): void {
  if (hasExited(child)) {
    return;
  }

  child.kill('SIGTERM');
  const killTimer = setTimeout(() => {
    if (!hasExited(child)) {
      child.kill('SIGKILL');
    }
  }, graceMs);

  killTimer.unref();

  child.once('close', () => {
    clearTimeout(killTimer);
  });
}
