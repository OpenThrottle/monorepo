/**
 * Coarse kinds of tool call, used to summarize a folded group as a sentence.
 * Listed in the order the summary reads them, `other` always last.
 */
export const CHAT_TOOL_CATEGORY_ORDER = [
  'command',
  'edit',
  'read',
  'search',
  'web',
  'other',
] as const;

/** One of {@link CHAT_TOOL_CATEGORY_ORDER}. */
export type ChatToolCategory = (typeof CHAT_TOOL_CATEGORY_ORDER)[number];

/**
 * Normalized tool names (lower-case, `-` as `_`) mapped to the category the
 * summary counts them under. A name that is not listed counts as `other`.
 *
 * Sourced from what the agent backends emit: Claude (`Bash`, `Edit`,
 * `MultiEdit`, `Write`, `NotebookEdit`, `Read`, `Grep`, `Glob`, `LS`,
 * `WebFetch`, `WebSearch`), Cursor (the `<kind>ToolCall` kinds `shell`,
 * `read`, `edit`, `grep`, `glob`, `ls`, plus its `*_file` / terminal names),
 * OpenCode (`bash`, `read`, `edit`, `write`, `patch`, `grep`, `glob`, `list`,
 * `webfetch`), Codex (`shell`, `local_shell`, `exec_command`,
 * `command_execution`, `apply_patch`, `file_change`, `web_search`), Gemini
 * (`run_shell_command`, `replace`, `write_file`, `read_file`,
 * `read_many_files`, `list_directory`, `glob`, `search_file_content`,
 * `google_web_search`, `web_fetch`) and Antigravity (`run_command`,
 * `run_terminal_command`, `view_file`, `write_to_file`, `edit_file`).
 */
export const CHAT_TOOL_CATEGORY_BY_NAME: Readonly<
  Record<string, ChatToolCategory>
> = {
  apply_patch: 'edit',
  bash: 'command',
  codebase_search: 'search',
  command_execution: 'command',
  create_file: 'edit',
  delete_file: 'edit',
  edit: 'edit',
  edit_file: 'edit',
  exec: 'command',
  exec_command: 'command',
  fetch: 'web',
  file_change: 'edit',
  file_search: 'search',
  find: 'search',
  find_by_name: 'search',
  glob: 'search',
  google_web_search: 'web',
  grep: 'search',
  grep_search: 'search',
  list: 'search',
  list_dir: 'search',
  list_directory: 'search',
  list_files: 'search',
  local_shell: 'command',
  ls: 'search',
  multi_edit: 'edit',
  multiedit: 'edit',
  notebook_edit: 'edit',
  notebookedit: 'edit',
  patch: 'edit',
  read: 'read',
  read_file: 'read',
  read_many_files: 'read',
  replace: 'edit',
  run_command: 'command',
  run_shell_command: 'command',
  run_terminal_cmd: 'command',
  run_terminal_command: 'command',
  search: 'search',
  search_file_content: 'search',
  search_files: 'search',
  search_replace: 'edit',
  shell: 'command',
  str_replace: 'edit',
  str_replace_based_edit_tool: 'edit',
  view: 'read',
  view_file: 'read',
  web_fetch: 'web',
  web_search: 'web',
  webfetch: 'web',
  websearch: 'web',
  write: 'edit',
  write_file: 'edit',
  write_to_file: 'edit',
};
