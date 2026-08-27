/**
 * Builds the `agy` argument array for one streamed chat turn. Unlike the gemini adapter — which
 * pipes the prompt through stdin because gemini's headless entry reads stdin to EOF — agy takes the
 * prompt as the VALUE of `-p`, so it travels in argv. Because this is a spawn arg array (never a
 * shell string) a prompt starting with `-` is still safe: it is a flag VALUE, not a positional.
 *
 * The flag set is the one verified in docs/openthrottle/antigravity-stream-json-schema.md §1/§3c
 * against Antigravity CLI 1.1.21.
 */

import {
  CONVERSATION_PERMISSION_MODES,
  type ConversationPermissionMode,
} from '../types.ts';

/**
 * Env var holding an absolute path to the agy binary; overrides PATH lookup.
 * Matches the `OPENTHROTTLE_ANTIGRAVITY_BIN` override the drivers registry advertises.
 */
export const ANTIGRAVITY_BIN_ENV = `OPENTHROTTLE_ANTIGRAVITY_BIN`;

/**
 * Default binary name, resolved off PATH when the env override is unset. Note the release tarball
 * names the artifact `antigravity`, but the installer places it as `agy` — this is the installed
 * name.
 */
export const ANTIGRAVITY_DEFAULT_BIN = `agy`;

/**
 * Inputs for one streamed agy turn.
 */
export interface AntigravityArgvOptions {
  /**
   * Extra directories to grant this turn beyond {@link cwd}, as ABSOLUTE paths
   * — the same relative-path caveat below applies to every one of them.
   * Emitted as one repeated `--add-dir` each, after the cwd's. Context only:
   * agy still runs in {@link cwd}.
   */
  readonly additionalDirectories?: readonly string[];
  /**
   * Absolute path to the run's working directory, emitted as `--add-dir`. LOAD-BEARING: without it
   * agy reports "you do not have an active workspace set" and writes into an invented scratch
   * project under `~/.gemini/antigravity-cli/scratch/<name>/` instead of the cwd. A relative path
   * is NOT honored, so callers must pass an absolute one; omitted only when unknown.
   */
  readonly cwd?: string;
  /** Model id; omitted when undefined/blank/`auto` so agy uses its default. */
  readonly model?: string;
  /**
   * Composer permission posture. agy has no graded `--approval-mode` equivalent: it exposes the
   * all-or-nothing `--dangerously-skip-permissions` plus `--mode accept-edits|plan`. Mapping:
   * `fullAccess` → `--dangerously-skip-permissions`; `autoAcceptEdits` → `--mode accept-edits`;
   * `supervised` and the no-mode default emit nothing (agy's own `request-review` posture).
   */
  readonly permissionMode?: ConversationPermissionMode;
  /** The turn's prompt; travels as the value of `-p`. */
  readonly prompt: string;
  /** Conversation id to resume via `--conversation` (agy resumes by id, unlike gemini). */
  readonly resumeConversationId?: string;
}

/**
 * Assemble the argv for a headless, NDJSON-streamed agy turn. `--output-format stream-json` emits
 * the `init`/`step_update`/`result` JSONL stream (§3c). The prompt is placed FIRST, immediately
 * after `-p`, mirroring the verified CLI contract.
 */
export function buildAntigravityArgv(
  options: AntigravityArgvOptions,
): string[] {
  const argv = ['-p', options.prompt, '--output-format', 'stream-json'];

  const cwd = options.cwd?.trim();
  if (cwd !== undefined && cwd !== '') {
    argv.push('--add-dir', cwd);
  }

  // The workspace dir comes FIRST, then one repeated `--add-dir` per extra
  // granted directory.
  for (const directory of options.additionalDirectories ?? []) {
    const trimmed = directory.trim();
    if (trimmed !== '') {
      argv.push('--add-dir', trimmed);
    }
  }

  if (options.permissionMode === CONVERSATION_PERMISSION_MODES.fullAccess) {
    argv.push('--dangerously-skip-permissions');
  } else if (
    options.permissionMode === CONVERSATION_PERMISSION_MODES.autoAcceptEdits
  ) {
    argv.push('--mode', 'accept-edits');
  }

  const conversationId = options.resumeConversationId?.trim();
  if (conversationId !== undefined && conversationId !== '') {
    argv.push('--conversation', conversationId);
  }

  const model = options.model?.trim();
  if (model !== undefined && model !== '' && model !== 'auto') {
    argv.push('--model', model);
  }

  return argv;
}
