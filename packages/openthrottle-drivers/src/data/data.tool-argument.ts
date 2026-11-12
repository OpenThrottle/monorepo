/**
 * @description Which input field carries the one short argument shown on a worker's `→ <tool>`
 * line, per tool, and how long each rendering may be. Tool names are matched lower-cased because
 * the CLIs disagree on casing (Claude `Read`, cursor/opencode `read`, antigravity `read_file`).
 */

export const TOOL_ARGUMENT_KINDS = {
  command: 'command',
  path: 'path',
  pattern: 'pattern',
} as const;

export type ToolArgumentKind =
  (typeof TOOL_ARGUMENT_KINDS)[keyof typeof TOOL_ARGUMENT_KINDS];

/** Input keys that hold the argument, tried in order, per kind. Event shapes differ per CLI. */
export const TOOL_ARGUMENT_FIELDS: Readonly<
  Record<ToolArgumentKind, readonly string[]>
> = {
  command: ['command', 'cmd'],
  path: [
    'file_path',
    'filePath',
    'path',
    'Path',
    'AbsolutePath',
    'notebook_path',
    'target_file',
  ],
  pattern: ['pattern', 'Pattern', 'query'],
};

/** Lower-cased tool name to the kind of argument it shows; any other tool stays a bare name. */
export const TOOL_ARGUMENT_KIND_BY_TOOL: Readonly<
  Record<string, ToolArgumentKind>
> = {
  bash: TOOL_ARGUMENT_KINDS.command,
  command_execution: TOOL_ARGUMENT_KINDS.command,
  edit: TOOL_ARGUMENT_KINDS.path,
  glob: TOOL_ARGUMENT_KINDS.pattern,
  grep: TOOL_ARGUMENT_KINDS.pattern,
  grep_search: TOOL_ARGUMENT_KINDS.pattern,
  multiedit: TOOL_ARGUMENT_KINDS.path,
  notebookedit: TOOL_ARGUMENT_KINDS.path,
  read: TOOL_ARGUMENT_KINDS.path,
  read_file: TOOL_ARGUMENT_KINDS.path,
  replace: TOOL_ARGUMENT_KINDS.path,
  run_shell_command: TOOL_ARGUMENT_KINDS.command,
  search_file_content: TOOL_ARGUMENT_KINDS.pattern,
  shell: TOOL_ARGUMENT_KINDS.command,
  write: TOOL_ARGUMENT_KINDS.path,
  write_file: TOOL_ARGUMENT_KINDS.path,
};

/** Longest rendered argument per kind, in characters. */
export const TOOL_ARGUMENT_MAX_LENGTH: Readonly<
  Record<ToolArgumentKind, number>
> = {
  command: 60,
  path: 80,
  pattern: 60,
};

/** Hard cap on a whole `→ <tool> <argument>` line. */
export const TOOL_LINE_MAX_LENGTH = 100;

export const TOOL_LINE_ELLIPSIS = '…';
