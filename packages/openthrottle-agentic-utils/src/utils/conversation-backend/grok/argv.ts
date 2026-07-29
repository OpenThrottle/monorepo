/**
 * Builds the `grok` argument array. The user prompt and persona are passed as
 * `=`-attached option values (`--single=<prompt>`, `--system-prompt-override=
 * <persona>`) — a single argv element each — so shell metacharacters AND a
 * leading `-`/`---` are inert (the adapter spawns without a shell, and clap
 * takes everything after `=` as the literal value). The flag set is the one
 * verified in docs/openthrottle/grok-stream-json-schema.md §1.
 */

import {
  CONVERSATION_PERMISSION_MODES,
  type ConversationPermissionMode,
} from '../types.ts';

/**
 * Env var holding an absolute path to the grok binary; overrides PATH lookup.
 * Matches the `OPENTHROTTLE_GROK_BIN` override the drivers registry advertises.
 */
export const GROK_BIN_ENV = `OPENTHROTTLE_GROK_BIN`;

/**
 * Default binary name, resolved off PATH when the env override is unset.
 */
export const GROK_DEFAULT_BIN = `grok`;

/**
 * Inputs for one streamed grok turn.
 */
export interface GrokArgvOptions {
  /** Workspace directory; passed as `--cwd` (and used as the spawn cwd). */
  readonly cwd: string;
  /** Model id; omitted when undefined/blank/`auto` so grok uses its default. */
  readonly model?: string;
  /**
   * Composer permission posture, mapped to a grok `--permission-mode`:
   * `fullAccess` → `bypassPermissions`; `autoAcceptEdits` → `acceptEdits`;
   * `supervised` → `default`; the no-mode default omits the flag (grok's own
   * default). A headless run cannot prompt, so nothing above `acceptEdits` is
   * granted unless explicitly requested.
   */
  readonly permissionMode?: ConversationPermissionMode;
  /** The latest user message (persona goes to `--system-prompt-override`). */
  readonly prompt: string;
  /** When true, resume `sessionId` via `-r`; otherwise start a fresh session. */
  readonly resume: boolean;
  /** grok session id to resume; required only when `resume` is true. */
  readonly sessionId?: string;
  /** Persona system prompt → first-class `--system-prompt-override`. */
  readonly systemPrompt?: string;
}

/** Map a composer permission posture onto a grok `--permission-mode` value, or undefined to omit. */
function permissionModeFlag(
  permissionMode: ConversationPermissionMode | undefined,
): string | undefined {
  if (permissionMode === CONVERSATION_PERMISSION_MODES.fullAccess) {
    return 'bypassPermissions';
  }
  if (permissionMode === CONVERSATION_PERMISSION_MODES.autoAcceptEdits) {
    return 'acceptEdits';
  }
  if (permissionMode === CONVERSATION_PERMISSION_MODES.supervised) {
    return 'default';
  }
  return undefined;
}

/**
 * Assemble the argv for a headless, session-scoped, JSON-streamed grok turn.
 * `--output-format streaming-json` emits the incremental `thought`/`text`/`end`
 * JSONL stream. `--single=<prompt>` is the headless single-turn flag. On resume,
 * `-r <sessionId>` continues the prior session (grok mints the id on turn one
 * and echoes it in the terminal `end` event; we never pre-mint).
 */
export function buildGrokArgv(options: GrokArgvOptions): string[] {
  const argv = [
    `--single=${options.prompt}`,
    '--output-format',
    'streaming-json',
    '--cwd',
    options.cwd,
  ];

  if (options.resume) {
    const sessionId = options.sessionId?.trim();
    if (sessionId === undefined || sessionId === '') {
      throw new Error('grok resume requires a sessionId.');
    }
    argv.push('-r', sessionId);
  }

  const model = options.model?.trim();
  if (model !== undefined && model !== '' && model !== 'auto') {
    argv.push('--model', model);
  }

  const systemPrompt = options.systemPrompt?.trim();
  if (systemPrompt !== undefined && systemPrompt !== '') {
    argv.push(`--system-prompt-override=${systemPrompt}`);
  }

  const permission = permissionModeFlag(options.permissionMode);
  if (permission !== undefined) {
    argv.push('--permission-mode', permission);
  }

  return argv;
}
