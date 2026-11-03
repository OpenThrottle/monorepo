/**
 * Static copy for {@link ChatUsageLimitNotice}. Kept out of the component per
 * the repo's component/data split.
 * @public
 */
export const CHAT_USAGE_LIMIT_COPY = {
  limitReached: 'Usage limit reached',
  resetsPrefix: 'resets',
} as const;

/**
 * Copy for {@link ChatContextMeter}. `{used}`, `{window}` and `{percent}` are
 * replaced with the formatted values.
 * @public
 */
export const CHAT_CONTEXT_METER_COPY = {
  ariaLabel: 'Context window: {used} of {window} tokens used ({percent}%)',
  percentToken: '{percent}',
  title: 'Context window used by the last turn',
  usedToken: '{used}',
  windowToken: '{window}',
} as const;

/**
 * Clause templates for a folded tool group's sentence summary, e.g. "Ran 3
 * commands and edited 2 files". `{count}` is replaced with the number; `one`
 * is used for a count of 1. `otherOnly` replaces `other` when every tool in the
 * group is uncategorized, so the summary reads "Used 2 tools", not "Used 2
 * other tools".
 * @public
 */
export const CHAT_TOOL_SUMMARY_COPY = {
  clauses: {
    command: { many: 'ran {count} commands', one: 'ran 1 command' },
    edit: { many: 'edited {count} files', one: 'edited 1 file' },
    other: { many: 'used {count} other tools', one: 'used 1 other tool' },
    read: { many: 'read {count} files', one: 'read 1 file' },
    search: { many: 'searched {count} times', one: 'searched once' },
    web: { many: 'fetched {count} web pages', one: 'fetched 1 web page' },
  },
  conjunction: 'and',
  countToken: '{count}',
  empty: 'No tool calls',
  otherOnly: { many: 'used {count} tools', one: 'used 1 tool' },
  separator: ', ',
} as const;
