/**
 * Per-kind readers for codex's non-text thread items (`command_execution`,
 * `mcp_tool_call`, `file_change`, `web_search`, `todo_list`, `error`, …): what a
 * chat tool card shows as its Arguments, as its Result, and whether the call
 * failed. Item shapes: docs/openthrottle/codex-stream-json-schema.md §3.
 *
 * Every reader is total — an unknown kind falls back to the raw item as its
 * result, so no codex card ever renders "No payload.".
 */

import { isRecord } from '@openthrottle/nodejs-utils';

/** What one finished (or started) codex item means for its tool card. */
export interface CodexToolItem {
  /** The card's Arguments, or null when the kind has none. */
  readonly args: unknown;
  /** True when the item reports a failed call. */
  readonly isError: boolean;
  /** The card's Result (or, when `isError`, its error text). */
  readonly result: unknown;
}

const asString = (value: unknown): string | undefined => {
  const isString = typeof value === 'string';

  return isString ? value : undefined;
};

/** A login-shell wrapper: `<shell> -lc 'cmd'`, `<shell> -lc "cmd"` or `<shell> -lc word`. */
const SHELL_WRAPPER =
  /^\S*\b(?:ba|z)?sh\s+-l?c\s+(?:'([\s\S]*)'|"((?:[^"\\]|\\[\s\S])*)"|(\S+))$/;

/**
 * `/bin/zsh -lc 'cat x'` → `cat x`. codex wraps every command in the user's
 * login shell — single-quoted, or double-quoted when the command itself holds a
 * single quote — and the wrapper is noise on a card. Anything that is not
 * exactly that shape is returned unchanged.
 */
export const unwrapShellCommand = (command: string): string => {
  const match = SHELL_WRAPPER.exec(command.trim());
  const singleQuoted = match?.[1]?.replace(/'\\''/g, `'`);
  const doubleQuoted = match?.[2]?.replace(/\\(["\\$`])/g, '$1');

  return singleQuoted ?? doubleQuoted ?? match?.[3] ?? command;
};

/** codex sends `command` as a string; older builds sent an argv array. */
const commandOf = (item: Record<string, unknown>): string | undefined => {
  const command = item.command;

  if (Array.isArray(command)) {
    return command.filter((part) => typeof part === 'string').join(' ');
  }

  return asString(command);
};

const commandExecution = (item: Record<string, unknown>): CodexToolItem => {
  const command = commandOf(item);
  const exitCode = typeof item.exit_code === 'number' ? item.exit_code : null;
  const isNonZeroExit = exitCode !== null && exitCode !== 0;
  const isError = item.status === 'failed' || isNonZeroExit;
  const output = asString(item.aggregated_output) ?? '';
  const exitText = exitCode === null ? '' : `Exited with code ${exitCode}.`;

  return {
    args:
      command === undefined ? null : { command: unwrapShellCommand(command) },
    isError,
    result: output === '' && isError ? exitText : output,
  };
};

const mcpToolCall = (item: Record<string, unknown>): CodexToolItem => {
  const error = isRecord(item.error) ? asString(item.error.message) : undefined;
  const isError = item.status === 'failed' || error !== undefined;

  return {
    args: {
      arguments: item.arguments ?? null,
      server: item.server ?? null,
      tool: item.tool ?? null,
    },
    isError,
    result: isError
      ? (error ?? 'MCP tool call failed.')
      : (item.result ?? null),
  };
};

const fileChange = (item: Record<string, unknown>): CodexToolItem => {
  const changes = Array.isArray(item.changes) ? item.changes : [];

  return {
    args: { changes },
    isError: item.status === 'failed',
    result: item.status ?? null,
  };
};

const webSearch = (item: Record<string, unknown>): CodexToolItem => {
  return {
    args: { query: item.query ?? null },
    isError: false,
    result: item.action ?? item.query ?? null,
  };
};

const todoList = (item: Record<string, unknown>): CodexToolItem => {
  return {
    args: null,
    isError: false,
    result: item.items ?? null,
  };
};

const errorItem = (item: Record<string, unknown>): CodexToolItem => {
  return {
    args: null,
    isError: true,
    result: asString(item.message) ?? 'codex reported an error.',
  };
};

const unknownItem = (item: Record<string, unknown>): CodexToolItem => {
  return { args: null, isError: item.status === 'failed', result: item };
};

/** Read a codex item of `kind` into its card's arguments, result and status. */
export const readCodexToolItem = (
  kind: string,
  item: Record<string, unknown>,
): CodexToolItem => {
  switch (kind) {
    case 'command_execution':
      return commandExecution(item);
    case 'error':
      return errorItem(item);
    case 'file_change':
      return fileChange(item);
    case 'mcp_tool_call':
      return mcpToolCall(item);
    case 'todo_list':
      return todoList(item);
    case 'web_search':
      return webSearch(item);
    default:
      return unknownItem(item);
  }
};
