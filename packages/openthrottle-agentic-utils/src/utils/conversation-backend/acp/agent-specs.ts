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
 *
 * Permission postures were probed on 2026-11-11 (plan 60dfd266) against
 * cursor-agent 2026.11.05. It advertises three modes: `agent` (tools),
 * `plan` (read-only) and `ask` (no edits or commands). Only `agent` can do
 * the work a chat turn asks for, and in `agent` cursor:
 * - applies file edits without raising `session/request_permission`, even
 *   when the client advertises `fs.writeTextFile` (it never calls it);
 * - asks for any shell command missing from the host's `~/.cursor/cli-config.json`
 *   allowlist (`approvalMode: allowlist`); allowlisted commands run unasked;
 * - asks for MCP tools that are not allowlisted;
 * - refuses edits outright, without asking, when a `Write(...)` rule denies them.
 * No mode or config option makes an edit ask, so supervised edits on cursor
 * cannot be approved in chat. {@link AcpAgentSpec.asksBeforeEdits} records
 * that, and the chat capabilities report it.
 *
 * - agy (Antigravity CLI) 1.5.6, probed 2026-11-11: ACP is the built-in
 *   `agy acp` subcommand (no separate `agy_acp_server`). It reads the host
 *   Google login itself (session/new succeeds with no `authenticate`) and
 *   honors session/new's `cwd` as the workspace, so the CLI adapter's
 *   load-bearing `--add-dir` is not needed. Advertises loadSession, image
 *   input, and four modes: `default` (asks before edits and commands),
 *   `accept-edits`, `auto` (asks only before irreversible actions) and `plan`.
 *   In `default` both a file write and a shell command raise
 *   `session/request_permission`, so supervised edits are approvable.
 */

import {
  ANTIGRAVITY_BIN_ENV,
  ANTIGRAVITY_DEFAULT_BIN,
} from '../antigravity/argv.ts';
import { buildAntigravityEnv } from '../antigravity/env.ts';
import {
  CURSOR_AGENT_BIN_ENV,
  CURSOR_AGENT_DEFAULT_BIN,
} from '../cursor-agent/argv.ts';
import { buildCursorAgentEnv } from '../cursor-agent/cursor-agent.ts';
import {
  CONVERSATION_PERMISSION_MODES,
  type ConversationPermissionMode,
} from '../types.ts';

/**
 * How to launch one ACP-speaking agent CLI.
 *
 * @public
 */
export interface AcpAgentSpec {
  /** Arguments that put the CLI into ACP stdio-server mode. */
  readonly args: readonly string[];
  /**
   * True when the agent raises `session/request_permission` before a file
   * edit in the mode supervised maps to, so a supervised edit can be approved
   * in chat. False means supervised gates only what the agent does ask about
   * (shell commands, MCP tools) and edits land unasked.
   */
  readonly asksBeforeEdits: boolean;
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
  /**
   * The agent's ACP session mode id for a composer permission posture, applied
   * before every prompt (a pooled session keeps the mode an earlier turn set),
   * or undefined to leave the session in whatever mode it is in.
   */
  readonly sessionMode: (
    permissionMode: ConversationPermissionMode | undefined,
  ) => string | undefined;
}

/** cursor-agent's env builder takes no extras; merge the run's mcpEnv on top. */
function cursorAcpEnv(
  host: NodeJS.ProcessEnv,
  extra: Readonly<Record<string, string>> | undefined,
): NodeJS.ProcessEnv {
  return { ...buildCursorAgentEnv(host), ...extra };
}

/** cursor-agent and agy read the host login themselves and need no `authenticate`. */
function noAuthentication(): undefined {
  return undefined;
}

/**
 * cursor's `agent` mode is the only one with tools, so every posture maps to
 * it; the posture itself is enforced by answering permission requests. Pinning
 * it keeps a session out of `plan`/`ask` whatever its default becomes.
 */
function cursorSessionMode(): string {
  return 'agent';
}

/** agy's env builder already merges the run's mcpEnv. */
function antigravityAcpEnv(
  host: NodeJS.ProcessEnv,
  extra: Readonly<Record<string, string>> | undefined,
): NodeJS.ProcessEnv {
  return buildAntigravityEnv(host, extra);
}

/**
 * agy's modes line up with the composer postures: `default` asks before edits
 * and commands (supervised, and the no-mode default, whose requests are then
 * refused), `accept-edits` stops asking for edits, and `auto` asks only before
 * irreversible actions, which fullAccess then allows anyway.
 */
function antigravitySessionMode(
  permissionMode: ConversationPermissionMode | undefined,
): string {
  if (permissionMode === CONVERSATION_PERMISSION_MODES.fullAccess) {
    return 'auto';
  }
  if (permissionMode === CONVERSATION_PERMISSION_MODES.autoAcceptEdits) {
    return 'accept-edits';
  }

  return 'default';
}

/**
 * ACP launch specs keyed by driver id. A driver missing here cannot be routed
 * through ACP, whatever the feature flag says.
 *
 * @public
 */
export const ACP_AGENT_SPECS: Readonly<Record<string, AcpAgentSpec>> = {
  antigravity: {
    args: ['acp'],
    asksBeforeEdits: true,
    authMethodId: noAuthentication,
    binEnv: ANTIGRAVITY_BIN_ENV,
    defaultBin: ANTIGRAVITY_DEFAULT_BIN,
    env: antigravityAcpEnv,
    id: 'antigravity',
    processGroup: true,
    sessionMode: antigravitySessionMode,
  },
  cursor: {
    args: ['acp'],
    asksBeforeEdits: false,
    authMethodId: noAuthentication,
    binEnv: CURSOR_AGENT_BIN_ENV,
    defaultBin: CURSOR_AGENT_DEFAULT_BIN,
    env: cursorAcpEnv,
    id: 'cursor',
    processGroup: true,
    sessionMode: cursorSessionMode,
  },
};
