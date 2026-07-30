/**
 * Builds the `cursor-agent` argument array. Every value — including the user
 * prompt — is a discrete array element, never interpolated into a string, so
 * shell metacharacters can never escape (the adapter spawns without a shell).
 * The flag set is the one verified in docs/openthrottle/cursor-agent-stream-json-schema.md.
 *
 * Note on reasoning/service tier: unlike the other CLIs, cursor-agent has NO
 * separate reasoning or tier flag in `--print` mode. Those dimensions are baked
 * into the model id itself — `cursor-agent models` lists concrete ids like
 * `claude-opus-4-8-high-fast` / `gpt-5.2-xhigh` (and `auto`, which takes no
 * suffix). The model-string bracket form (`<model>[effort=…,fast=…]`) is
 * rejected at run time (`Cannot use this model: auto[fast=false]`). So the model
 * picker IS the reasoning/tier selector for cursor, and the composer does not
 * advertise separate reasoning/tier controls for it — the `--model` value is
 * passed through verbatim.
 */

import {
  CONVERSATION_PERMISSION_MODES,
  type ConversationPermissionMode,
} from '../types.ts';

/**
 * Env var holding an absolute path to the cursor-agent binary; overrides PATH lookup.
 */
export const CURSOR_AGENT_BIN_ENV = `OPENTHROTTLE_CURSOR_AGENT_BIN`;

/**
 * Default binary name, resolved off PATH when the env override is unset.
 */
export const CURSOR_AGENT_DEFAULT_BIN = `cursor-agent`;

/**
 * Inputs for one streamed cursor-agent turn.
 */
export interface CursorAgentArgvOptions {
  /** Workspace directory; passed as `--workspace` (and used as the spawn cwd). */
  readonly cwd: string;
  /**
   * Model id, passed to `--model` verbatim. cursor bakes reasoning + tier into
   * the id (e.g. `claude-opus-4-8-high-fast`), so no suffix is composed here.
   * Omitted when undefined so cursor-agent uses its default.
   */
  readonly model?: string;
  /**
   * Composer permission posture. cursor-agent always runs `--trust` (the
   * workspace is a registered, ownership-checked checkout); on top of that,
   * `fullAccess` adds `--force` (run every tool call unless explicitly denied).
   * `supervised`/`autoAcceptEdits`/no-mode keep the safe trust-only posture —
   * headless cursor has no distinct edits-only auto-run flag, so those collapse
   * to the safe posture (the composer advertises only the two distinct modes).
   */
  readonly permissionMode?: ConversationPermissionMode;
  /** The fully-composed prompt (persona prefix already applied by the caller). */
  readonly prompt: string;
  /** Chat session id to resume; one OT conversation maps to one cursor chat. */
  readonly sessionId: string;
}

/**
 * Assemble the argv for a streamed, headless, session-resumed turn. The prompt
 * is always the final element.
 */
export function buildCursorAgentArgv(
  options: CursorAgentArgvOptions,
): string[] {
  const argv = [
    '--print',
    '--output-format',
    'stream-json',
    '--stream-partial-output',
    '--workspace',
    options.cwd,
    '--trust',
    '--resume',
    options.sessionId,
  ];

  // fullAccess adds `--force` (run every tool call unless denied) on top of the
  // always-on `--trust`; every other posture stays trust-only (the safe
  // default). Placed before the `--` terminator + prompt.
  if (options.permissionMode === CONVERSATION_PERMISSION_MODES.fullAccess) {
    argv.push('--force');
  }

  if (options.model !== undefined && options.model !== '') {
    argv.push('--model', options.model);
  }

  // End-of-options marker: persona system prompts are skill markdown that often
  // starts with YAML frontmatter (`---`), which commander/yargs would otherwise
  // treat as an unknown flag (`error: unknown option '---'`).
  argv.push('--', options.prompt);

  return argv;
}
