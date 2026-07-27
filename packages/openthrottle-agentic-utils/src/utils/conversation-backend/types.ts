/**
 * The streaming seam shared by every conversation backend.
 *
 * A backend — an OpenAI-compatible HTTP endpoint, or a spawned agentic CLI — is
 * just an async iterable of {@link ConversationStreamChunk}. Mapping a source's
 * native output onto this one shape is the whole integration surface: everything
 * downstream (PubSub publish, the `conversationStreamChunkAdded` subscription,
 * the client accumulator) stays identical regardless of which backend produced
 * the chunks. The chunk `kind` is defined here once so the server payload and
 * client renderer can derive from a single source.
 */

import type { ChatCompletionMessage } from '../chat-completions/index.ts';

/**
 * Permission postures a CLI backend can run under, mirroring the developer-app
 * composer's `ChatPermissionMode` (`@openthrottle/react-router-chat`). Carried
 * as the raw UI enum end-to-end and resolved to concrete CLI flags inside each
 * backend's argv/config builder (never in the resolver/service, which stay
 * transport-only). `supervised` asks before commands/edits; `autoAcceptEdits`
 * auto-approves edits only; `fullAccess` runs everything without prompts. In a
 * headless `--print` spawn there is no approval UI, so every mode still carries
 * a scoped allowlist for the injected managed MCP servers — see each argv
 * builder for the exact mapping.
 *
 * @public
 */
export const CONVERSATION_PERMISSION_MODES = {
  autoAcceptEdits: 'autoAcceptEdits',
  fullAccess: 'fullAccess',
  supervised: 'supervised',
} as const;

/**
 * One of the {@link CONVERSATION_PERMISSION_MODES} values.
 *
 * @public
 */
export type ConversationPermissionMode =
  (typeof CONVERSATION_PERMISSION_MODES)[keyof typeof CONVERSATION_PERMISSION_MODES];

/**
 * Narrow an untrusted transport string (GraphQL input) to a
 * {@link ConversationPermissionMode}, or `undefined` when it is absent or not a
 * recognized mode. Keeps the resolver transport-only: it forwards the raw input
 * through this one guard rather than mapping to CLI flags itself.
 *
 * @public
 */
export function toConversationPermissionMode(
  value: string | null | undefined,
): ConversationPermissionMode | undefined {
  if (value == null) {
    return undefined;
  }
  for (const mode of Object.values(CONVERSATION_PERMISSION_MODES)) {
    if (mode === value) {
      return mode;
    }
  }
  return undefined;
}

/**
 * Event kinds a backend can emit. `text` is plain assistant output; the rest
 * describe richer agentic events (reasoning, tool use, token accounting, the
 * backend's session handle). Values are snake_case to match the wire payload.
 *
 * @public
 */
export const CONVERSATION_STREAM_CHUNK_KINDS = {
  session: 'session',
  text: 'text',
  thinking: 'thinking',
  toolCall: 'tool_call',
  toolResult: 'tool_result',
  usage: 'usage',
} as const;

/**
 * One of the {@link CONVERSATION_STREAM_CHUNK_KINDS} values.
 *
 * @public
 */
export type ConversationStreamChunkKind =
  (typeof CONVERSATION_STREAM_CHUNK_KINDS)[keyof typeof CONVERSATION_STREAM_CHUNK_KINDS];

/**
 * One emitted piece of a streamed turn. `delta` carries incremental text for
 * `kind: 'text'` (empty on the terminal chunk); non-text kinds use `metadata`
 * for their structured payload. `done` is true exactly once, on the terminal
 * chunk. `error` is set when the stream failed.
 *
 * @public
 */
export interface ConversationStreamChunk {
  /** Incremental text for this chunk (empty for non-text kinds and the terminal chunk). */
  readonly delta: string;
  /** True exactly once, on the terminal chunk. */
  readonly done: boolean;
  /** Error message when the stream failed; null/undefined otherwise. */
  readonly error?: string | null;
  /** What this chunk represents. */
  readonly kind: ConversationStreamChunkKind;
  /** Structured payload for non-text kinds (tool args, usage, session id, …). */
  readonly metadata?: Readonly<Record<string, unknown>>;
}

/**
 * Everything a backend needs to produce one streamed turn. OpenAI uses
 * `messages` + `baseUrl`; CLI backends (added later) extend this with their own
 * fields (working directory, session handle, system prompt). All backends honor
 * `signal` for cancellation.
 *
 * @public
 */
export interface ConversationBackendRun {
  /** OpenAI-compatible base URL; required by the openai backend. */
  readonly baseUrl?: string;
  /** Working directory the CLI runs in; required by CLI backends. */
  readonly cwd?: string;
  /**
   * Extra environment variables a CLI backend must pass through to the spawned
   * child (and, transitively, to its MCP servers) — the OT MCP auth token + API
   * URLs, plus any adapter-specific keys (e.g. opencode's config path). Scoped:
   * the server populates this only when MCP is configured, so an adapter's env
   * stays allowlisted otherwise. Ignored by the openai backend.
   */
  readonly mcpEnv?: Readonly<Record<string, string>>;
  /**
   * Managed MCP servers to expose to a CLI backend, keyed by server name in the
   * canonical `.mcp.json` schema (`command`/`args`/`env`/`description`). Built
   * server-side via `buildManagedMcpServers`. Empty/undefined ⇒ no MCP
   * injection. Each CLI adapter formats this for its own config mechanism
   * (claude `--mcp-config`, opencode `OPENCODE_CONFIG`). Ignored by openai.
   */
  readonly mcpServers?: Readonly<
    Record<string, Readonly<Record<string, unknown>>>
  >;
  /** Full prompt context (prior history + the new user message), oldest first. */
  readonly messages: ReadonlyArray<ChatCompletionMessage>;
  /** Model id to complete with. */
  readonly model: string;
  /**
   * Permission posture selected in the composer toolbar. CLI backends resolve
   * it to concrete permission flags in their argv/config builder; when absent
   * they apply a safe default that unblocks only the injected managed MCP
   * servers. Ignored by the openai backend.
   */
  readonly permissionMode?: ConversationPermissionMode;
  /**
   * When true, resume the given `sessionId` rather than create it. Only CLI
   * backends whose "create" and "resume" invocations differ read this: claude
   * uses `--session-id` (create) vs `--resume` (continue). Cursor (which always
   * resumes a pre-minted id) and opencode (which mints on first run when
   * `sessionId` is absent) ignore it. Defaults to false (create/first turn).
   */
  readonly resumeSession?: boolean;
  /**
   * CLI backend session handle to resume (e.g. a cursor-agent chat id). CLI
   * backends own multi-turn context themselves, so they read only the latest
   * user message from `messages` and rely on this id for history. Optional for
   * backends that mint the id on the first run (opencode).
   */
  readonly sessionId?: string;
  /** Optional abort signal; cancels the in-flight stream. */
  readonly signal?: AbortSignal;
  /**
   * System prompt to steer the turn (e.g. a persona). CLI backends without a
   * native system-prompt flag inject it as a prompt prefix.
   */
  readonly systemPrompt?: string;
}

/**
 * A streaming conversation source. Implementations map their native output onto
 * {@link ConversationStreamChunk}; the consumer never sees backend specifics.
 *
 * @public
 */
export interface ConversationBackend {
  stream(run: ConversationBackendRun): AsyncIterable<ConversationStreamChunk>;
}
