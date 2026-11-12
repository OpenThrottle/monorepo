/**
 * Per-agent launch facts for the ACP conversation backend: which binary speaks
 * ACP over stdio, how to scrub its environment, and which ACP auth method to
 * call before `session/new`. Everything else (sessions, prompts, cancel,
 * resume, MCP injection, model selection) is protocol-generic and lives in
 * `acp.ts` — these specs are the per-agent shims the T3 teardown predicted.
 *
 * Verified against the installed CLIs in the plan 6644e9b9 spike (2026-11-07):
 * - cursor-agent 2026.11.05: `cursor-agent acp`; no `authenticate` call needed
 *   (host login is read directly); advertises loadSession + session/list.
 */

import {
  CURSOR_AGENT_BIN_ENV,
  CURSOR_AGENT_DEFAULT_BIN,
} from '../cursor-agent/argv.ts';
import { buildCursorAgentEnv } from '../cursor-agent/cursor-agent.ts';

/**
 * How to launch one ACP-speaking agent CLI.
 *
 * @public
 */
export interface AcpAgentSpec {
  /** Arguments that put the CLI into ACP stdio-server mode. */
  readonly args: readonly string[];
  /**
   * The ACP `authenticate` method id to call after `initialize`, or undefined
   * to skip authentication. Called only when the agent advertises the id.
   */
  readonly authMethodId: (env: NodeJS.ProcessEnv) => string | undefined;
  /** Env var holding an absolute-path override for the binary. */
  readonly binEnv: string;
  /** Binary resolved off PATH when {@link AcpAgentSpec.binEnv} is unset. */
  readonly defaultBin: string;
  /** Allowlisted child environment; `extra` is the run's `mcpEnv`. */
  readonly env: (
    host: NodeJS.ProcessEnv,
    extra: Readonly<Record<string, string>> | undefined,
  ) => NodeJS.ProcessEnv;
  /** Driver id this spec backs (the conversation `backend` discriminator). */
  readonly id: string;
  /**
   * Spawn the agent in its own process group and tear the whole group down.
   * cursor's `worker-server` grandchild outlives its parent otherwise.
   */
  readonly processGroup: boolean;
}

/** cursor-agent's env builder takes no extras; merge the run's mcpEnv on top. */
function cursorAcpEnv(
  host: NodeJS.ProcessEnv,
  extra: Readonly<Record<string, string>> | undefined,
): NodeJS.ProcessEnv {
  return { ...buildCursorAgentEnv(host), ...extra };
}

/** cursor-agent reads the host login itself and needs no `authenticate`. */
function noAuthentication(): undefined {
  return undefined;
}

/**
 * ACP launch specs keyed by driver id. A driver missing here cannot be routed
 * through ACP, whatever the feature flag says.
 *
 * @public
 */
export const ACP_AGENT_SPECS: Readonly<Record<string, AcpAgentSpec>> = {
  cursor: {
    args: ['acp'],
    authMethodId: noAuthentication,
    binEnv: CURSOR_AGENT_BIN_ENV,
    defaultBin: CURSOR_AGENT_DEFAULT_BIN,
    env: cursorAcpEnv,
    id: 'cursor',
    processGroup: true,
  },
};
