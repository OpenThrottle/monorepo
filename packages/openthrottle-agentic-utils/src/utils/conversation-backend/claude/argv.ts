/**
 * Builds the `claude` (Claude Code) argument array. Every value — including the
 * user prompt and persona — is a discrete array element, never interpolated into
 * a string, so shell metacharacters can never escape (the adapter spawns without
 * a shell). The flag set is the one verified in
 * docs/openthrottle/claude-stream-json-schema.md §1.
 */

/**
 * Env var holding an absolute path to the claude binary; overrides PATH lookup.
 */
export const CLAUDE_BIN_ENV = `OPENTHROTTLE_CLAUDE_BIN`;

/**
 * Default binary name, resolved off PATH when the env override is unset.
 */
export const CLAUDE_DEFAULT_BIN = `claude`;

/**
 * Inputs for one streamed claude turn.
 */
export interface ClaudeArgvOptions {
  /**
   * Managed MCP servers (canonical `.mcp.json` schema) to expose to this turn.
   * When non-empty, they are passed inline via `--mcp-config` + a
   * `--strict-mcp-config` so only these load (project `.mcp.json` and the
   * user's `~/.claude.json` are ignored — deterministic in headless spawns).
   * Empty/undefined ⇒ no MCP flags.
   */
  readonly mcpServers?: Readonly<
    Record<string, Readonly<Record<string, unknown>>>
  >;
  /** Model id; omitted when undefined so claude uses its account default. */
  readonly model?: string;
  /** The latest user message (persona goes to `--append-system-prompt`, not here). */
  readonly prompt: string;
  /**
   * When true, resume `sessionId` (`--resume`); otherwise create it up front
   * (`--session-id`). claude, unlike cursor, sets the id itself on turn one.
   */
  readonly resume: boolean;
  /** The session UUID we mint and own; set on turn one, resumed thereafter. */
  readonly sessionId: string;
  /** Persona system prompt → first-class `--append-system-prompt` (no prefix hack). */
  readonly systemPrompt?: string;
}

/**
 * Assemble the argv for a streamed, headless, session-scoped turn. `--verbose`
 * is required for `stream-json` under `--print`; `--include-partial-messages`
 * turns on the incremental `stream_event` deltas. The prompt is always the final
 * element, after a `--` end-of-options marker (persona/prompt text can start with
 * `---` frontmatter, which the parser would otherwise treat as a flag).
 */
export function buildClaudeArgv(options: ClaudeArgvOptions): string[] {
  const argv = [
    '--print',
    '--output-format',
    'stream-json',
    '--include-partial-messages',
    '--verbose',
    options.resume ? '--resume' : '--session-id',
    options.sessionId,
  ];

  if (options.model !== undefined && options.model !== '') {
    argv.push('--model', options.model);
  }

  const systemPrompt = options.systemPrompt?.trim();
  if (systemPrompt !== undefined && systemPrompt !== '') {
    argv.push('--append-system-prompt', systemPrompt);
  }

  // Inject managed MCP servers inline (JSON string, not a file — no checkout
  // pollution). `--strict-mcp-config` makes this the ONLY source, so the spawn
  // doesn't depend on an approved project `.mcp.json` or the host `~/.claude.json`.
  if (
    options.mcpServers !== undefined &&
    Object.keys(options.mcpServers).length > 0
  ) {
    argv.push(
      '--mcp-config',
      JSON.stringify({ mcpServers: options.mcpServers }),
      '--strict-mcp-config',
    );
  }

  argv.push('--', options.prompt);

  return argv;
}
