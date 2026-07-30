/**
 * Builds the `codex exec` argument array. Every value — including the user
 * prompt and persona prefix — is a discrete array element, never interpolated
 * into a string, so shell metacharacters can never escape (the adapter spawns
 * without a shell). The flag set is the one verified in
 * docs/openthrottle/codex-stream-json-schema.md §1.
 */

import {
  CONVERSATION_PERMISSION_MODES,
  CONVERSATION_REASONING_EFFORTS,
  type ConversationPermissionMode,
  type ConversationReasoningEffort,
} from '../types.ts';

/**
 * Env var holding an absolute path to the codex binary; overrides PATH lookup.
 * Matches the `OPENTHROTTLE_CODEX_BIN` override the drivers registry advertises.
 */
export const CODEX_BIN_ENV = `OPENTHROTTLE_CODEX_BIN`;

/**
 * Default binary name, resolved off PATH when the env override is unset.
 */
export const CODEX_DEFAULT_BIN = `codex`;

/**
 * Inputs for one streamed codex turn.
 */
export interface CodexArgvOptions {
  /** Model id; omitted when undefined/blank/`auto` so codex uses its default. */
  readonly model?: string;
  /**
   * Composer permission posture, mapped to a codex sandbox policy:
   * `fullAccess` → `--dangerously-bypass-approvals-and-sandbox`;
   * `autoAcceptEdits` → `--sandbox workspace-write`; `supervised` and the
   * no-mode default → `--sandbox read-only` (a headless `exec` cannot prompt,
   * so the safe posture is read-only unless edits were explicitly authorized).
   */
  readonly permissionMode?: ConversationPermissionMode;
  /** The fully-composed prompt (persona prefix already applied by the caller). */
  readonly prompt: string;
  /**
   * Composer reasoning effort, mapped to codex's `-c model_reasoning_effort=`
   * config override. codex/OpenAI accept `minimal`/`low`/`medium`/`high`, so
   * the UI ceiling is clamped: `high`/`extraHigh`/`max`/`ultra` → `high`.
   * Omitted ⇒ no override (codex's config default). See {@link buildCodexArgv}.
   */
  readonly reasoning?: ConversationReasoningEffort;
  /**
   * When true, resume `sessionId` via the `exec resume <id>` subcommand;
   * otherwise start a fresh `exec` (codex mints the thread id and surfaces it
   * in the stream).
   */
  readonly resume: boolean;
  /** codex thread/session id to resume; required only when `resume` is true. */
  readonly sessionId?: string;
}

/** Map a composer permission posture onto codex sandbox flags. */
function sandboxFlags(
  permissionMode: ConversationPermissionMode | undefined,
): string[] {
  if (permissionMode === CONVERSATION_PERMISSION_MODES.fullAccess) {
    return ['--dangerously-bypass-approvals-and-sandbox'];
  }
  if (permissionMode === CONVERSATION_PERMISSION_MODES.autoAcceptEdits) {
    return ['--sandbox', 'workspace-write'];
  }
  // `supervised` and the no-mode default: read-only (no unattended writes).
  return ['--sandbox', 'read-only'];
}

/**
 * Map the composer reasoning level onto codex's `model_reasoning_effort` value
 * (`low`/`medium`/`high`), or `undefined` to omit the override. codex/OpenAI
 * cap reasoning at `high`, so `extraHigh`/`max`/`ultra` all clamp to `high`.
 */
function reasoningEffort(
  reasoning: ConversationReasoningEffort | undefined,
): string | undefined {
  switch (reasoning) {
    case CONVERSATION_REASONING_EFFORTS.low:
      return 'low';
    case CONVERSATION_REASONING_EFFORTS.medium:
      return 'medium';
    case CONVERSATION_REASONING_EFFORTS.high:
    case CONVERSATION_REASONING_EFFORTS.extraHigh:
    case CONVERSATION_REASONING_EFFORTS.max:
    case CONVERSATION_REASONING_EFFORTS.ultra:
      return 'high';
    default:
      return undefined;
  }
}

/**
 * Assemble the argv for a streamed, headless codex turn. `--json` emits the
 * JSONL thread-event stream; `--skip-git-repo-check` lets codex run in a
 * workspace that is not a git repo. The prompt is always the final element,
 * after a `--` end-of-options marker (verified: codex honors `--`, so a prompt
 * that starts with `-`/`---` can never be parsed as a flag). On resume the
 * session id is the first positional after `--`, the prompt the second.
 */
export function buildCodexArgv(options: CodexArgvOptions): string[] {
  const common = [
    '--json',
    '--skip-git-repo-check',
    ...sandboxFlags(options.permissionMode),
  ];

  // `-c model_reasoning_effort=<value>` overrides the config-file default for
  // this run only (one `-c` arg is `key=value`; see `codex exec --help`).
  const effort = reasoningEffort(options.reasoning);
  if (effort !== undefined) {
    common.push('-c', `model_reasoning_effort=${effort}`);
  }

  const model = options.model?.trim();
  if (model !== undefined && model !== '' && model !== 'auto') {
    common.push('--model', model);
  }

  if (options.resume) {
    const sessionId = options.sessionId?.trim();
    if (sessionId === undefined || sessionId === '') {
      throw new Error('codex resume requires a sessionId.');
    }
    return ['exec', 'resume', ...common, '--', sessionId, options.prompt];
  }

  return ['exec', ...common, '--', options.prompt];
}
