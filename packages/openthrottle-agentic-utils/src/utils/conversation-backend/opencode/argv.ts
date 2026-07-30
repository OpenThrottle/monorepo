/**
 * Builds the `opencode` argument array. Every value — including the user prompt
 * and persona — is a discrete array element, never interpolated into a string,
 * so shell metacharacters can never escape (the adapter spawns without a shell).
 * The flag set is the one verified in
 * docs/openthrottle/opencode-stream-json-schema.md §1.
 */

import {
  CONVERSATION_REASONING_EFFORTS,
  type ConversationReasoningEffort,
} from '../types.ts';

/**
 * Env var holding an absolute path to the opencode binary; overrides PATH lookup.
 */
export const OPENCODE_BIN_ENV = `OPENTHROTTLE_OPENCODE_BIN`;

/**
 * Default binary name, resolved off PATH when the env override is unset.
 */
export const OPENCODE_DEFAULT_BIN = `opencode`;

/**
 * Inputs for one streamed opencode turn.
 */
export interface OpencodeArgvOptions {
  /**
   * When true, emit `--auto` (blanket auto-approve of all permissions not
   * explicitly denied) — the opencode analog of claude's
   * `--permission-mode bypassPermissions`, used only for the `fullAccess`
   * posture. Scoped/default postures are expressed in the temp config's
   * `permission` slice (see mcp-config.ts), not here.
   */
  readonly auto?: boolean;
  /** Workspace directory; passed as `--dir` (and used as the spawn cwd). */
  readonly cwd: string;
  /** Model as `provider/model`; omitted when undefined so opencode uses its default. */
  readonly model?: string;
  /**
   * The fully-composed prompt (persona prefix already applied by the caller —
   * opencode has no system-prompt flag).
   */
  readonly prompt: string;
  /**
   * Composer reasoning effort, mapped to opencode's `--variant` (provider-
   * specific model variant / reasoning effort). Uses the token set opencode
   * documents (`minimal`/`high`/`max`) plus the OpenAI-style middle levels:
   * `low`→`low`, `medium`→`medium`, `high`/`extraHigh`→`high`,
   * `max`/`ultra`→`max`. Omitted ⇒ no flag (the model's default variant).
   */
  readonly reasoning?: ConversationReasoningEffort;
  /**
   * Session id to resume (`-s`); omitted on the first turn so opencode mints a
   * new session (its id is surfaced in the stream, not supplied by us).
   */
  readonly sessionId?: string;
}

/**
 * Map the composer reasoning level onto an opencode `--variant` token, or
 * `undefined` to omit the flag. Uses opencode's documented `minimal`/`high`/
 * `max` plus OpenAI-style middles: `low`→`low`, `medium`→`medium`,
 * `high`/`extraHigh`→`high`, `max`/`ultra`→`max`.
 */
function variant(
  reasoning: ConversationReasoningEffort | undefined,
): string | undefined {
  switch (reasoning) {
    case CONVERSATION_REASONING_EFFORTS.low:
      return 'low';
    case CONVERSATION_REASONING_EFFORTS.medium:
      return 'medium';
    case CONVERSATION_REASONING_EFFORTS.high:
    case CONVERSATION_REASONING_EFFORTS.extraHigh:
      return 'high';
    case CONVERSATION_REASONING_EFFORTS.max:
    case CONVERSATION_REASONING_EFFORTS.ultra:
      return 'max';
    default:
      return undefined;
  }
}

/**
 * Assemble the argv for a headless single-turn JSON-streamed run. `--format
 * json` emits the raw NDJSON event stream; the prompt is always the final
 * element, after a `--` end-of-options marker (a persona prefix can start with
 * `---` frontmatter, which yargs would otherwise treat as an option).
 */
export function buildOpencodeArgv(options: OpencodeArgvOptions): string[] {
  const argv = ['run'];

  if (options.auto === true) {
    argv.push('--auto');
  }

  argv.push('--format', 'json', '--dir', options.cwd);

  if (options.sessionId !== undefined && options.sessionId !== '') {
    argv.push('-s', options.sessionId);
  }

  if (options.model !== undefined && options.model !== '') {
    argv.push('-m', options.model);
  }

  const modelVariant = variant(options.reasoning);
  if (modelVariant !== undefined) {
    argv.push('--variant', modelVariant);
  }

  argv.push('--', options.prompt);

  return argv;
}
