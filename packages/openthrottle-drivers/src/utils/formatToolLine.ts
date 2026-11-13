/**
 * @description Renders a worker's tool call as one short line, `→ <tool> <argument>`, shared by the
 * Claude stream-json renderer here and the other CLIs' structured-output renderer in
 * `openthrottle-agentic-utils`. Only fields a tool's input clearly carries are shown; anything else
 * stays the bare `→ <tool>`.
 */

import type { ToolArgumentKind } from '../data/data.tool-argument.ts';
import {
  TOOL_ARGUMENT_FIELDS,
  TOOL_ARGUMENT_KIND_BY_TOOL,
  TOOL_ARGUMENT_KINDS,
  TOOL_ARGUMENT_MAX_LENGTH,
  TOOL_LINE_ELLIPSIS,
  TOOL_LINE_MAX_LENGTH,
} from '../data/data.tool-argument.ts';

export interface FormatToolLineOptions {
  /** Directory absolute paths are shown relative to; defaults to `process.cwd()`. */
  readonly cwd: string | undefined;
}

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

const firstString = (
  input: Record<string, unknown>,
  fields: readonly string[],
): string | undefined => {
  for (const field of fields) {
    const value = input[field];

    if (typeof value === 'string' && value.trim() !== '') {
      return value;
    }
  }

  return undefined;
};

const clipEnd = (text: string, max: number): string => {
  if (text.length <= max) {
    return text;
  }

  return `${text.slice(0, max - 1).trimEnd()}${TOOL_LINE_ELLIPSIS}`;
};

const clipStart = (text: string, max: number): string => {
  if (text.length <= max) {
    return text;
  }

  return `${TOOL_LINE_ELLIPSIS}${text.slice(text.length - max + 1)}`;
};

/**
 * Relative to `cwd` when the path is inside it; otherwise an absolute path keeps its last two
 * segments (`cursor-agent/argv.ts`), enough to tell files apart without the long prefix.
 */
const shortenPath = (path: string, cwd: string): string => {
  const prefix = cwd.endsWith('/') ? cwd : `${cwd}/`;

  if (path.startsWith(prefix)) {
    return path.slice(prefix.length);
  }

  if (!path.startsWith('/')) {
    return path;
  }

  return path.split('/').filter(Boolean).slice(-2).join('/');
};

const argumentOf = (
  kind: ToolArgumentKind,
  value: string,
  cwd: string,
): string => {
  const max = TOOL_ARGUMENT_MAX_LENGTH[kind];

  if (kind === TOOL_ARGUMENT_KINDS.path) {
    return clipStart(shortenPath(value.trim(), cwd), max);
  }

  return clipEnd(value.replace(/\s+/g, ' ').trim(), max);
};

/**
 * @description `→ <tool>` plus one short argument when the tool's input has one: a file path (cwd-
 * relative, else last two segments) for Read/Edit/Write, the first 60 characters of a command on a
 * single line for Bash, the pattern for Grep/Glob. Unknown tools, or an input without the field,
 * give the bare `→ <tool>`. One line, at most 100 characters, `…` marks anything cut.
 * @public
 */
export const formatToolLine = (
  name: string,
  input: unknown,
  options?: FormatToolLineOptions,
): string => {
  const bare = `→ ${name}`;
  const kind = TOOL_ARGUMENT_KIND_BY_TOOL[name.toLowerCase()];

  if (kind === undefined || !isRecord(input)) {
    return bare;
  }

  const value = firstString(input, TOOL_ARGUMENT_FIELDS[kind]);

  if (value === undefined) {
    return bare;
  }

  const cwd = options?.cwd ?? process.cwd();

  return clipEnd(
    `${bare} ${argumentOf(kind, value, cwd)}`,
    TOOL_LINE_MAX_LENGTH,
  );
};
