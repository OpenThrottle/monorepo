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
 * Lower-cased tool names, across backends (Claude, Cursor, OpenCode, Codex,
 * Gemini), mapped to the category the summary counts them under. A name that
 * is not listed counts as `other`.
 */
export const CHAT_TOOL_CATEGORY_BY_NAME: ReadonlyMap<string, ChatToolCategory> =
  new Map<string, ChatToolCategory>([
    ['apply_patch', 'edit'],
    ['bash', 'command'],
    ['codebase_search', 'search'],
    ['create_file', 'edit'],
    ['delete_file', 'edit'],
    ['edit', 'edit'],
    ['edit_file', 'edit'],
    ['exec', 'command'],
    ['exec_command', 'command'],
    ['fetch', 'web'],
    ['file_search', 'search'],
    ['find', 'search'],
    ['glob', 'search'],
    ['grep', 'search'],
    ['grep_search', 'search'],
    ['list', 'search'],
    ['list_dir', 'search'],
    ['ls', 'search'],
    ['multiedit', 'edit'],
    ['notebookedit', 'edit'],
    ['patch', 'edit'],
    ['read', 'read'],
    ['read_file', 'read'],
    ['replace', 'edit'],
    ['run_command', 'command'],
    ['run_shell_command', 'command'],
    ['run_terminal_cmd', 'command'],
    ['search', 'search'],
    ['search_replace', 'edit'],
    ['shell', 'command'],
    ['str_replace', 'edit'],
    ['str_replace_based_edit_tool', 'edit'],
    ['view', 'read'],
    ['view_file', 'read'],
    ['web_fetch', 'web'],
    ['web_search', 'web'],
    ['webfetch', 'web'],
    ['websearch', 'web'],
    ['write', 'edit'],
    ['write_file', 'edit'],
  ]);
