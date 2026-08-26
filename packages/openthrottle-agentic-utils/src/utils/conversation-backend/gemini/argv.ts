/**
 * Builds the `gemini` argument array for one streamed chat turn. The prompt is
 * deliberately NOT in argv: gemini 0.25.2's headless entry reads a non-TTY
 * stdin to EOF and uses it as the one-shot input (verified in the installed
 * source, `dist/src/gemini.js`), so the adapter pipes the prompt through stdin.
 * That sidesteps two positional-prompt hazards at once — a prompt starting with
 * `-` being parsed as a flag, and the deprecated `-p` flag. The flag set is the
 * one verified in docs/openthrottle/gemini-stream-json-schema.md §1.
 */

import {
  CONVERSATION_PERMISSION_MODES,
  type ConversationPermissionMode,
} from '../types.ts';

/**
 * Env var holding an absolute path to the gemini binary; overrides PATH lookup.
 * Matches the `OPENTHROTTLE_GEMINI_BIN` override the drivers registry advertises.
 */
export const GEMINI_BIN_ENV = `OPENTHROTTLE_GEMINI_BIN`;

/**
 * Default binary name, resolved off PATH when the env override is unset.
 */
export const GEMINI_DEFAULT_BIN = `gemini`;

/**
 * Inputs for one streamed gemini turn (the prompt travels via stdin, not argv).
 */
export interface GeminiArgvOptions {
  /** Model id; omitted when undefined/blank/`auto` so gemini uses its default. */
  readonly model?: string;
  /**
   * Composer permission posture, mapped 1:1 onto gemini's `--approval-mode`:
   * `fullAccess` → `yolo`; `autoAcceptEdits` → `auto_edit`; `supervised` →
   * `default`; the no-mode default omits the flag (gemini's own `default`).
   */
  readonly permissionMode?: ConversationPermissionMode;
}

/** Map a composer permission posture onto a gemini `--approval-mode` value, or undefined to omit. */
function approvalModeFlag(
  permissionMode: ConversationPermissionMode | undefined,
): string | undefined {
  if (permissionMode === CONVERSATION_PERMISSION_MODES.fullAccess) {
    return 'yolo';
  }
  if (permissionMode === CONVERSATION_PERMISSION_MODES.autoAcceptEdits) {
    return 'auto_edit';
  }
  if (permissionMode === CONVERSATION_PERMISSION_MODES.supervised) {
    return 'default';
  }
  return undefined;
}

/**
 * Assemble the argv for a headless, NDJSON-streamed gemini turn.
 * `--output-format stream-json` emits the `init`/`message`/`tool_use`/
 * `tool_result`/`error`/`result` JSONL stream. There is no reasoning-effort or
 * service-tier flag in 0.25.2, and no session flag here: `--resume` is
 * index-based (not id-based), so multi-turn context is flattened into the
 * prompt instead (see `gemini.ts`).
 */
export function buildGeminiArgv(options: GeminiArgvOptions = {}): string[] {
  const argv = ['--output-format', 'stream-json'];

  const approval = approvalModeFlag(options.permissionMode);
  if (approval !== undefined) {
    argv.push('--approval-mode', approval);
  }

  const model = options.model?.trim();
  if (model !== undefined && model !== '' && model !== 'auto') {
    argv.push('--model', model);
  }

  return argv;
}
