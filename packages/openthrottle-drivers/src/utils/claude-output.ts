/**
 * @description Parses Claude Code `--output-format stream-json --verbose` stdout (NDJSON) back into
 * what a plain-text `claude -p` run would have printed, plus the usage-limit signal that text mode
 * hides. Verified against Claude Code 2.1.270: the terminal `result` event's `result` string is
 * byte-identical to text-mode stdout, so Ralph's `<promise>…</promise>` markers keep parsing.
 * See docs/openthrottle/claude-stream-json-schema.md.
 */

import type { DriverParsedOutput } from '../types/index.ts';
import type { UsageLimit } from './usage-limit.ts';
import {
  isClaudeUsageLimitResult,
  parseClaudeRateLimitInfo,
} from './usage-limit.ts';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** Parse one NDJSON line; non-JSON noise (plugin/hook output, blank lines) yields `undefined`. */
const parseLine = (line: string): Record<string, unknown> | undefined => {
  const trimmed = line.trim();

  if (!trimmed.startsWith('{')) {
    return undefined;
  }

  try {
    const parsed: unknown = JSON.parse(trimmed);

    return isRecord(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
};

/**
 * @description Recovers the iteration text and any usage limit from Claude `stream-json` stdout.
 *
 * - `text` is the LAST `result` event's `result` string; with no `result` event (crash, kill) it is
 *   the raw stdout trimmed, so errors stay visible.
 * - `usageLimit` is the last `rejected` `rate_limit_event` (carries the reset time) when the run did
 *   not finish successfully — an error `result`, or no `result` at all. A `rejected` event followed
 *   by a successful `result` is not a limit: the run completed. When the terminal is a 429 error
 *   `result` and no rejected event was seen, the limit is `{ rateLimitType: null, resetsAt: null }`
 *   ("limited, reset unknown"). The human `result` text is never inspected.
 * @public
 */
export const parseClaudeStreamJsonOutput = (
  stdout: string,
): DriverParsedOutput => {
  let rejected: UsageLimit | null = null;
  let result: Record<string, unknown> | undefined;

  for (const line of stdout.split('\n')) {
    const event = parseLine(line);

    if (event === undefined) {
      continue;
    }

    if (event.type === 'rate_limit_event') {
      rejected = parseClaudeRateLimitInfo(event.rate_limit_info) ?? rejected;
    } else if (event.type === 'result') {
      result = event;
    }
  }

  if (result === undefined) {
    return { text: stdout.trim(), usageLimit: rejected };
  }

  const text = typeof result.result === 'string' ? result.result.trim() : '';

  if (isClaudeUsageLimitResult(result)) {
    return {
      text,
      usageLimit: rejected ?? { rateLimitType: null, resetsAt: null },
    };
  }

  return {
    text,
    usageLimit: result.is_error === true ? rejected : null,
  };
};

/** Text of an `assistant` event's `text` content blocks plus a `→ <tool>` line per `tool_use` block. */
const renderAssistantEvent = (
  event: Record<string, unknown>,
): string | null => {
  const message = event.message;
  const content = isRecord(message) ? message.content : undefined;

  if (!Array.isArray(content)) {
    return null;
  }

  const parts: string[] = [];

  for (const block of content) {
    if (!isRecord(block)) {
      continue;
    }

    if (block.type === 'text' && typeof block.text === 'string') {
      parts.push(block.text);
    } else if (block.type === 'tool_use' && typeof block.name === 'string') {
      parts.push(`→ ${block.name}`);
    }
  }

  const rendered = parts.join('\n');

  return rendered.trim() === '' ? null : rendered;
};

/**
 * @description Live renderer for one line of Claude `stream-json` stdout (the driver's
 * `renderOutputLine`), so plan output and job logs read as prose instead of NDJSON.
 *
 * - `assistant` events render their `text` blocks, plus `→ <tool name>` for each `tool_use` block.
 * - A rejected `rate_limit_event` renders `Usage limit reached (<type>) — resets <ISO>`, omitting
 *   whichever parts are unknown.
 * - A `result` with `is_error` renders `Error: <result text>`; a successful `result` is `null`
 *   because its text already arrived through the `assistant` events.
 * - Everything else (`system`, hooks, `user` tool-result echoes, allowed rate-limit events) is `null`.
 * - Lines that are not JSON objects pass through unchanged (plugin/hook noise was visible before);
 *   blank lines are skipped.
 * @public
 */
export const renderClaudeStreamJsonLine = (line: string): string | null => {
  if (line.trim() === '') {
    return null;
  }

  const event = parseLine(line);

  if (event === undefined) {
    return line;
  }

  switch (event.type) {
    case 'assistant':
      return renderAssistantEvent(event);
    case 'rate_limit_event': {
      const limit = parseClaudeRateLimitInfo(event.rate_limit_info);

      if (limit === null) {
        return null;
      }

      const window =
        limit.rateLimitType === null ? '' : ` (${limit.rateLimitType})`;
      const resets =
        limit.resetsAt === null ? '' : ` — resets ${limit.resetsAt}`;

      return `Usage limit reached${window}${resets}`;
    }
    case 'result':
      return event.is_error === true
        ? `Error: ${typeof event.result === 'string' ? event.result.trim() : 'unknown error'}`
        : null;
    default:
      return null;
  }
};
