/**
 * Builds the `cursor-agent` argument array. Every value — including the user
 * prompt — is a discrete array element, never interpolated into a string, so
 * shell metacharacters can never escape (the adapter spawns without a shell).
 * The flag set is the one verified in docs/openthrottle/cursor-agent-stream-json-schema.md.
 */

/** Env var holding an absolute path to the cursor-agent binary; overrides PATH lookup. */
export const CURSOR_AGENT_BIN_ENV = 'OPENTHROTTLE_CURSOR_AGENT_BIN';

/** Default binary name, resolved off PATH when the env override is unset. */
export const CURSOR_AGENT_DEFAULT_BIN = 'cursor-agent';

/** Inputs for one streamed cursor-agent turn. */
export interface CursorAgentArgvOptions {
  /** Workspace directory; passed as `--workspace` (and used as the spawn cwd). */
  readonly cwd: string;
  /** Model id; omitted when undefined so cursor-agent uses its default. */
  readonly model?: string;
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
  if (options.model !== undefined && options.model !== '') {
    argv.push('--model', options.model);
  }
  argv.push(options.prompt);
  return argv;
}
