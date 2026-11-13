/**
 * @description Behavioral capabilities per chat backend, so the UI and
 * orchestration read what a backend can do instead of branching on its name,
 * plus the per-backend additional-directory ceiling.
 * The base table describes each headless CLI adapter (derived from the
 * adapters' header comments and argv builders); an ACP overlay applies when
 * `OPENTHROTTLE_CHAT_ACP_BACKENDS` routes the backend's chat over ACP.
 */

import { ACP_AGENT_SPECS } from './acp/agent-specs.ts';
import { isAcpChatEnabled } from './acp/routing.ts';

/**
 * What a chat backend can do on a turn.
 *
 * @public
 */
export interface ChatBackendCapabilities {
  /** Tool-use approvals surface to the user in supervised mode. */
  readonly approvals: boolean;
  /**
   * Supervised approvals cover file edits too. False where approvals exist
   * but the agent applies edits unasked (cursor under ACP).
   */
  readonly editApprovals: boolean;
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
  editApprovals: false,
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
  grok: { ...NO_CAPABILITIES, resume: true },
  openai: { ...NO_CAPABILITIES, replaysFullHistory: true },
  opencode: { ...NO_CAPABILITIES, mcpInjection: true, resume: true },
};

/**
 * Static ACP overlay, per the 2026-11-07 spike (not probed): session/load
 * resumes, supervised mode surfaces approvals, session/new injects MCP.
 * cursor and agy advertise `promptCapabilities.image`.
 */
const ACP_IMAGE_INPUT: Readonly<Record<string, boolean>> = {
  antigravity: true,
  cursor: true,
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
    editApprovals: ACP_AGENT_SPECS[backend]?.asksBeforeEdits ?? false,
    imageInput: ACP_IMAGE_INPUT[backend] ?? false,
    mcpInjection: true,
    replaysFullHistory: false,
    resume: true,
    steering: base.steering,
  };
}

/**
 * Per-driver ceiling on how many checkouts one turn may hold in context.
 *
 * This is the ENFORCEMENT half of the cap the composer advertises. The client
 * gate (`ChatBackendCapabilities.maxRepositories`) is UX — it stops a user
 * picking a third repository for a CLI that cannot use one. This one is the
 * real boundary: the resolver applies it to the client's array before anything
 * is spawned, so a bypassed or drifted client cannot grant a CLI directories it
 * will silently drop.
 *
 * It lives here rather than beside the descriptors because the honest source of
 * truth is the adapter: a backend may exceed one only if its argv builder emits
 * a repeatable directory flag.
 */

/** A backend with no additional-directory concept runs in its cwd alone. */
const SINGLE_DIRECTORY_CAP = 1;

/**
 * Backends whose argv builder emits a repeatable `--add-dir`, and the ceiling
 * each is allowed. Keep this in step with the per-driver `maxRepositories` the
 * composer advertises — a backend listed here but capped at 1 client-side just
 * never receives extra directories, while the reverse would let the UI promise
 * something the adapter drops on the floor.
 */
const ADDITIONAL_DIRECTORY_CAPS: Readonly<Record<string, number>> = {
  antigravity: 4,
  claude: 4,
};

/**
 * How many checkouts `backend` may receive, primary included. Unknown backends
 * get the conservative single-directory cap.
 *
 * @public
 */
export const maxDirectoriesForBackend = (backend: string): number => {
  return ADDITIONAL_DIRECTORY_CAPS[backend] ?? SINGLE_DIRECTORY_CAP;
};

/**
 * Warn that `backend` was handed extra directories it cannot grant, and ignore
 * them.
 *
 * Reaching this is not routine: the server caps the array per driver before the
 * spawn, so a populated list here means a client bypassed the UI gate or the
 * two caps have drifted apart. Loud-but-harmless is the right posture — the
 * turn still runs in its cwd, but the drop is never silent.
 *
 * @public
 */
export const warnUnsupportedAdditionalDirectories = (
  backend: string,
  additionalDirectories: readonly string[] | undefined,
  warn: (message: string) => void = console.warn,
): void => {
  if (
    additionalDirectories === undefined ||
    additionalDirectories.length === 0
  ) {
    return;
  }

  warn(
    `The ${backend} backend has no additional-directory flag; ignoring ${additionalDirectories.length} extra granted director${additionalDirectories.length === 1 ? 'y' : 'ies'}.`,
  );
};
