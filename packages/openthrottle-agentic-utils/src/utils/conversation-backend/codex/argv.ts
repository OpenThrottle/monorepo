/**
 * Builds the `codex exec` argument array. Every value — including the user
 * prompt and persona prefix — is a discrete array element, never interpolated
 * into a string, so shell metacharacters can never escape (the adapter spawns
 * without a shell). The flag set is the one verified in
 * docs/openthrottle/codex-stream-json-schema.md §1.
 */

import { codexReasoningEffort } from '@openthrottle/openthrottle-drivers';

import {
  CONVERSATION_PERMISSION_MODES,
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
  /**
   * Discovered local OpenAI-compatible endpoint to target. When set, codex runs
   * through its built-in OSS provider (`--oss`) redirected at this base URL via a
   * `-c model_providers.oss.base_url` override — preferred over a hand-rolled
   * custom provider because codex owns the OSS wire adapter.
   */
  readonly baseUrl?: string;
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

/** The codex sandbox policy for a composer permission posture, or null to bypass it. */
function sandboxMode(
  permissionMode: ConversationPermissionMode | undefined,
): 'read-only' | 'workspace-write' | null {
  if (permissionMode === CONVERSATION_PERMISSION_MODES.fullAccess) {
    return null;
  }
  if (permissionMode === CONVERSATION_PERMISSION_MODES.autoAcceptEdits) {
    return 'workspace-write';
  }
  // `supervised` and the no-mode default: read-only (no unattended writes).
  return 'read-only';
}

/**
 * Map a composer permission posture onto codex sandbox flags. `codex exec`
 * takes `--sandbox <mode>`, but `codex exec resume` (0.167.0) rejects it
 * ("unexpected argument '--sandbox'") and has no equivalent flag, so a resumed
 * turn sets the same policy through the `sandbox_mode` config key instead. The
 * bypass flag is accepted by both.
 */
function sandboxFlags(
  permissionMode: ConversationPermissionMode | undefined,
  resume: boolean,
): string[] {
  const mode = sandboxMode(permissionMode);
  if (mode === null) {
    return ['--dangerously-bypass-approvals-and-sandbox'];
  }
  if (resume) {
    return ['-c', `sandbox_mode=${JSON.stringify(mode)}`];
  }
  return ['--sandbox', mode];
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
    ...sandboxFlags(options.permissionMode, options.resume),
  ];

  // `-c model_reasoning_effort=<value>` overrides the config-file default for
  // this run only (one `-c` arg is `key=value`; see `codex exec --help`).
  const effort = codexReasoningEffort(options.reasoning);
  if (effort !== undefined) {
    common.push('-c', `model_reasoning_effort=${effort}`);
  }

  const baseUrl = options.baseUrl?.trim();
  if (baseUrl !== undefined && baseUrl !== '') {
    // `--local-provider ollama` keeps the run deterministic in headless mode
    // (codex would otherwise prompt/pick). The `-c` value is a TOML string
    // literal (JSON.stringify quotes it); passed as one argv element (no shell).
    common.push(
      '--oss',
      '--local-provider',
      'ollama',
      '-c',
      `model_providers.oss.base_url=${JSON.stringify(baseUrl)}`,
    );
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
