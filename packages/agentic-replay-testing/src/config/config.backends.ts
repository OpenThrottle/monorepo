/**
 * Per-backend recording profiles: which production backend to drive, which
 * `*_BIN` override installs the shim, and what in that CLI's output is account
 * configuration rather than protocol.
 */

import {
  antigravityConversationBackend,
  claudeConversationBackend,
  codexConversationBackend,
  type ConversationBackend,
  createCursorAgentSession,
  cursorAgentConversationBackend,
  opencodeConversationBackend,
} from '@openthrottle/openthrottle-agentic-utils';
import { type DriverId, getDriver } from '@openthrottle/openthrottle-drivers';

import { DEFAULT_REDACT_KEYS } from '../utils/sanitizer/sanitizer.ts';

/**
 * How a backend gets the session a resume turn continues:
 * - `caller` — the caller supplies the id on every turn (claude mints a UUID;
 *   cursor pre-mints one with `create-chat`). Replays use `placeholderUuid(1)`.
 * - `cli` — the CLI mints it and reports it in a `session` chunk; the next
 *   turn passes it back.
 * - `none` — no session; history travels in the prompt.
 *
 * @public
 */
export const SESSION_STRATEGIES = {
  caller: 'caller',
  cli: 'cli',
  none: 'none',
} as const;

/** @public */
export type SessionStrategy =
  (typeof SESSION_STRATEGIES)[keyof typeof SESSION_STRATEGIES];

/** @public */
export interface RecordingProfile {
  /** Driver id; also the fixture subdirectory name. */
  readonly backend: string;
  /** Env var the production backend reads to locate its binary. */
  readonly binEnv: string;
  /** The production conversation backend recorded through. */
  readonly conversationBackend: ConversationBackend;
  /** Binary name resolved off PATH when no explicit path is given. */
  readonly defaultBin: string;
  /** Model recorded with, or null for the account default. */
  readonly defaultModel: string | null;
  /**
   * Stdout lines to leave out of a fixture because they describe the
   * recording host rather than the protocol (e.g. its plugin hooks).
   */
  readonly dropStdoutLine: (line: string) => boolean;
  /**
   * Mint the caller-owned session id for a `caller` backend before turn one,
   * against the real CLI. Absent ⇒ a random UUID.
   */
  readonly mintSession: ((cwd: string) => Promise<string>) | undefined;
  readonly redactKeys: readonly string[];
  readonly sessionStrategy: SessionStrategy;
  readonly versionArgs: readonly string[];
}

/**
 * The part of a profile a replay needs.
 *
 * @public
 */
export type ReplayProfile = Pick<
  RecordingProfile,
  'backend' | 'binEnv' | 'conversationBackend' | 'sessionStrategy'
>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function parseJsonLine(line: string): unknown {
  try {
    return JSON.parse(line);
  } catch {
    return undefined;
  }
}

/**
 * Claude replays the host user's SessionStart plugin hooks on every headless
 * turn unless `OPENTHROTTLE_CLAUDE_CONFIG_DIR` isolates it. Those `system`
 * `hook_*` events carry the recording machine's plugins and CLAUDE.md, never
 * protocol the backend depends on (it maps them to nothing).
 */
function isClaudeHookEvent(line: string): boolean {
  const event = parseJsonLine(line);
  return (
    isRecord(event) &&
    event.type === 'system' &&
    typeof event.subtype === 'string' &&
    event.subtype.startsWith('hook_')
  );
}

/**
 * codex reports problems in the host user's `~/.codex/config.toml` as
 * `item.completed` error items on every turn, quoting that file's settings
 * (its MCP servers among them).
 */
function isCodexHostConfigWarning(line: string): boolean {
  const event = parseJsonLine(line);
  if (!isRecord(event) || event.type !== 'item.completed') {
    return false;
  }
  const { item } = event;
  return (
    isRecord(item) &&
    item.type === 'error' &&
    typeof item.message === 'string' &&
    item.message.includes('config.toml')
  );
}

function neverDrop(): boolean {
  return false;
}

/**
 * A profile whose bin env, binary and version flags come from the drivers
 * registry — the single source the backends and discovery also read.
 */
function profileFor(
  id: DriverId,
  fields: Pick<
    RecordingProfile,
    | 'conversationBackend'
    | 'defaultModel'
    | 'dropStdoutLine'
    | 'mintSession'
    | 'redactKeys'
    | 'sessionStrategy'
  >,
): RecordingProfile {
  const driver = getDriver(id);
  return {
    ...fields,
    backend: id,
    binEnv: driver.binEnv ?? `OPENTHROTTLE_${id.toUpperCase()}_BIN`,
    defaultBin: driver.binary,
    versionArgs: driver.versionArgs,
  };
}

/** @public */
export const CLAUDE_RECORDING_PROFILE: RecordingProfile = profileFor('claude', {
  conversationBackend: claudeConversationBackend,
  defaultModel: 'sonnet',
  dropStdoutLine: isClaudeHookEvent,
  mintSession: undefined,
  // The init event lists the recording host's installed agents, skills,
  // slash commands, MCP servers, memory files and every tool those expose
  // (including connected integrations such as mail).
  redactKeys: [
    ...DEFAULT_REDACT_KEYS,
    'agents',
    'mcp_servers',
    'memory_paths',
    'skills',
    'slash_commands',
    'tools',
  ],
  sessionStrategy: SESSION_STRATEGIES.caller,
});

/** @public */
export const CURSOR_RECORDING_PROFILE: RecordingProfile = profileFor('cursor', {
  conversationBackend: cursorAgentConversationBackend,
  defaultModel: null,
  dropStdoutLine: neverDrop,
  // The server mints the chat with `create-chat` before the first turn; the
  // recorder does the same against the real CLI.
  mintSession: async (cwd) => createCursorAgentSession({ cwd }),
  redactKeys: [...DEFAULT_REDACT_KEYS, 'apiKey', 'mcpServers', 'tools'],
  sessionStrategy: SESSION_STRATEGIES.caller,
});

/** @public */
export const CODEX_RECORDING_PROFILE: RecordingProfile = profileFor('codex', {
  conversationBackend: codexConversationBackend,
  defaultModel: null,
  dropStdoutLine: isCodexHostConfigWarning,
  mintSession: undefined,
  redactKeys: DEFAULT_REDACT_KEYS,
  sessionStrategy: SESSION_STRATEGIES.cli,
});

/** @public */
export const OPENCODE_RECORDING_PROFILE: RecordingProfile = profileFor(
  'opencode',
  {
    conversationBackend: opencodeConversationBackend,
    defaultModel: null,
    dropStdoutLine: neverDrop,
    mintSession: undefined,
    redactKeys: DEFAULT_REDACT_KEYS,
    sessionStrategy: SESSION_STRATEGIES.cli,
  },
);

/** @public */
export const ANTIGRAVITY_RECORDING_PROFILE: RecordingProfile = profileFor(
  'antigravity',
  {
    conversationBackend: antigravityConversationBackend,
    defaultModel: null,
    dropStdoutLine: neverDrop,
    mintSession: undefined,
    redactKeys: DEFAULT_REDACT_KEYS,
    sessionStrategy: SESSION_STRATEGIES.cli,
  },
);

/**
 * Recording profiles by driver id.
 *
 * @public
 */
export const RECORDING_PROFILES: Readonly<Record<string, RecordingProfile>> = {
  antigravity: ANTIGRAVITY_RECORDING_PROFILE,
  claude: CLAUDE_RECORDING_PROFILE,
  codex: CODEX_RECORDING_PROFILE,
  cursor: CURSOR_RECORDING_PROFILE,
  opencode: OPENCODE_RECORDING_PROFILE,
};
