/**
 * Builds the `opencode` argument array. Every value — including the user prompt
 * and persona — is a discrete array element, never interpolated into a string,
 * so shell metacharacters can never escape (the adapter spawns without a shell).
 * The flag set is the one verified in
 * docs/openthrottle/opencode-stream-json-schema.md §1.
 */

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
   * Session id to resume (`-s`); omitted on the first turn so opencode mints a
   * new session (its id is surfaced in the stream, not supplied by us).
   */
  readonly sessionId?: string;
}

/**
 * Assemble the argv for a headless single-turn JSON-streamed run. `--format
 * json` emits the raw NDJSON event stream; the prompt is always the final
 * element, after a `--` end-of-options marker (a persona prefix can start with
 * `---` frontmatter, which yargs would otherwise treat as an option).
 */
export function buildOpencodeArgv(options: OpencodeArgvOptions): string[] {
  const argv = ['run', '--format', 'json', '--dir', options.cwd];

  if (options.sessionId !== undefined && options.sessionId !== '') {
    argv.push('-s', options.sessionId);
  }

  if (options.model !== undefined && options.model !== '') {
    argv.push('-m', options.model);
  }

  argv.push('--', options.prompt);

  return argv;
}
