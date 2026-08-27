/**
 * Builds the `claude` (Claude Code) argument array. Every value — including the
 * user prompt and persona — is a discrete array element, never interpolated into
 * a string, so shell metacharacters can never escape (the adapter spawns without
 * a shell). The flag set is the one verified in
 * docs/openthrottle/claude-stream-json-schema.md §1.
 */

import {
  CONVERSATION_PERMISSION_MODES,
  CONVERSATION_REASONING_EFFORTS,
  type ConversationPermissionMode,
  type ConversationReasoningEffort,
} from '../types.ts';

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
   * Extra directories to grant this turn beyond the spawn cwd, as ABSOLUTE
   * paths. Emitted as one repeated `--add-dir` each. Context only — claude
   * still runs in the cwd.
   */
  readonly additionalDirectories?: readonly string[];
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
  /**
   * Composer permission posture. Mapped to concrete claude flags:
   * `fullAccess` → `--permission-mode bypassPermissions`; `autoAcceptEdits` →
   * `--permission-mode acceptEdits` plus the scoped MCP allowlist;
   * `supervised` and the no-mode default → the scoped MCP allowlist only.
   * See {@link buildClaudeArgv}.
   */
  readonly permissionMode?: ConversationPermissionMode;
  /** The latest user message (persona goes to `--append-system-prompt`, not here). */
  readonly prompt: string;
  /**
   * Composer reasoning effort. Mapped to claude's `--effort` vocabulary
   * (`low`/`medium`/`high`/`xhigh`/`max`): `extraHigh` → `xhigh`, `ultra` →
   * `max`. Omitted ⇒ no `--effort` flag (claude's own default). See
   * {@link buildClaudeArgv}.
   */
  readonly reasoning?: ConversationReasoningEffort;
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
 * Map the composer reasoning level onto claude's `--effort` vocabulary
 * (`low`/`medium`/`high`/`xhigh`/`max`), or `undefined` to omit the flag.
 * `extraHigh` → `xhigh`; both `max` and `ultra` → `max` (claude's ceiling).
 */
function effortFlag(
  reasoning: ConversationReasoningEffort | undefined,
): string | undefined {
  switch (reasoning) {
    case CONVERSATION_REASONING_EFFORTS.low:
      return 'low';
    case CONVERSATION_REASONING_EFFORTS.medium:
      return 'medium';
    case CONVERSATION_REASONING_EFFORTS.high:
      return 'high';
    case CONVERSATION_REASONING_EFFORTS.extraHigh:
      return 'xhigh';
    case CONVERSATION_REASONING_EFFORTS.max:
    case CONVERSATION_REASONING_EFFORTS.ultra:
      return 'max';
    default:
      return undefined;
  }
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

  // One repeated `--add-dir` per extra granted directory. Blank entries are
  // dropped rather than emitted as an empty flag value.
  for (const directory of options.additionalDirectories ?? []) {
    const trimmed = directory.trim();
    if (trimmed !== '') {
      argv.push('--add-dir', trimmed);
    }
  }

  const systemPrompt = options.systemPrompt?.trim();
  if (systemPrompt !== undefined && systemPrompt !== '') {
    argv.push('--append-system-prompt', systemPrompt);
  }

  const effort = effortFlag(options.reasoning);
  if (effort !== undefined) {
    argv.push('--effort', effort);
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

  // Permission handling. In headless `--print` there is NO interactive approval
  // UI, so any tool that would need approval and is not pre-allowed is
  // auto-denied ("user declined the approval"). Every non-`fullAccess` posture
  // therefore still carries a scoped `--allowedTools` grant for the injected
  // managed MCP servers (`mcp__<server>__*`), so their tools are callable —
  // `--strict-mcp-config` already restricts loading to only those vetted
  // servers, so this grants nothing broader. `acceptEdits` covers file edits
  // only (NOT MCP), so it is additive on top of the allowlist, never a
  // replacement for it. All permission flags precede the `--` end-of-options
  // marker; the allowlist is one comma-joined value so it can never swallow the
  // following `--`.
  const mcpAllowlist = Object.keys(options.mcpServers ?? {}).map(
    (name) => `mcp__${name}__*`,
  );
  const pushMcpAllowlist = (): void => {
    if (mcpAllowlist.length > 0) {
      argv.push('--allowedTools', mcpAllowlist.join(','));
    }
  };

  if (options.permissionMode === CONVERSATION_PERMISSION_MODES.fullAccess) {
    argv.push('--permission-mode', 'bypassPermissions');
  } else if (
    options.permissionMode === CONVERSATION_PERMISSION_MODES.autoAcceptEdits
  ) {
    argv.push('--permission-mode', 'acceptEdits');
    pushMcpAllowlist();
  } else {
    // `supervised` and the no-mode default: scoped MCP allowlist only.
    pushMcpAllowlist();
  }

  argv.push('--', options.prompt);

  return argv;
}
