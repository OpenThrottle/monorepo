const PLACEHOLDER = '{taskStartSha}';

/**
 * @description POSIX single-quote escaping of one shell word.
 * @public
 */
export const shellEscape = (value: string): string => {
  return `'${value.replaceAll(`'`, `'\\''`)}'`;
};

/**
 * @description Replaces every `{taskStartSha}` with the shell-escaped sha, the only placeholder (§ 6).
 * @public
 */
export const substituteTaskStartSha = (
  command: string,
  taskStartSha: string,
): string => {
  return command.replaceAll(PLACEHOLDER, shellEscape(taskStartSha));
};
