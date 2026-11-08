/**
 * @description Behavioral capabilities per chat backend, so the UI and
 * orchestration read what a backend can do instead of branching on its name.
 * The base table describes each headless CLI adapter (derived from the
 * adapters' header comments and argv builders); an ACP overlay applies when
 * `OPENTHROTTLE_CHAT_ACP_BACKENDS` routes the backend's chat over ACP.
 */

import { isAcpChatEnabled } from './acp/routing.ts';

/**
 * What a chat backend can do on a turn.
 *
 * @public
 */
export interface ChatBackendCapabilities {
  /** Tool-use approvals surface to the user in supervised mode. */
  readonly approvals: boolean;
  /** The backend accepts image input in a prompt. */
  readonly imageInput: boolean;
  /** The adapter consumes `run.mcpServers` (OT MCP is injected per run). */
  readonly mcpInjection: boolean;
  /** The backend is handed the full message history every turn. */
  readonly replaysFullHistory: boolean;
  /** A conversation resumes by backend session id across turns. */
  readonly resume: boolean;
  /** The user can steer a turn that is already running. */
  readonly steering: boolean;
}

const NO_CAPABILITIES: ChatBackendCapabilities = {
  approvals: false,
  imageInput: false,
  mcpInjection: false,
  replaysFullHistory: false,
  resume: false,
  steering: false,
};

/**
 * CLI-path capabilities. Every CLI path runs headless, so approvals and
 * steering are false everywhere. `mcpInjection` is true only where the adapter
 * passes `run.mcpServers` through (claude: `--mcp-config`; opencode: a written
 * config file).
 */
const CLI_CAPABILITIES: Readonly<Record<string, ChatBackendCapabilities>> = {
  antigravity: { ...NO_CAPABILITIES, resume: true },
  claude: { ...NO_CAPABILITIES, mcpInjection: true, resume: true },
  codex: { ...NO_CAPABILITIES, resume: true },
  cursor: { ...NO_CAPABILITIES, resume: true },
  gemini: { ...NO_CAPABILITIES, replaysFullHistory: true },
  grok: { ...NO_CAPABILITIES, resume: true },
  openai: { ...NO_CAPABILITIES, replaysFullHistory: true },
  opencode: { ...NO_CAPABILITIES, mcpInjection: true, resume: true },
};

/**
 * Static ACP overlay, per the 2026-11-07 spike (not probed): session/load
 * resumes, supervised mode surfaces approvals, session/new injects MCP.
 * cursor advertises `promptCapabilities.image`; gemini is unverified, so false.
 */
const ACP_IMAGE_INPUT: Readonly<Record<string, boolean>> = {
  cursor: true,
  gemini: false,
};

/**
 * Resolve a backend's capabilities for the current environment. An unknown
 * backend resolves to all false.
 *
 * @public
 */
export function resolveChatBackendCapabilities(
  backend: string,
  env: NodeJS.ProcessEnv = process.env,
): ChatBackendCapabilities {
  const base = CLI_CAPABILITIES[backend];

  if (base === undefined) {
    return NO_CAPABILITIES;
  }

  if (!isAcpChatEnabled(backend, env)) {
    return base;
  }

  return {
    approvals: true,
    imageInput: ACP_IMAGE_INPUT[backend] ?? false,
    mcpInjection: true,
    replaysFullHistory: false,
    resume: true,
    steering: base.steering,
  };
}
