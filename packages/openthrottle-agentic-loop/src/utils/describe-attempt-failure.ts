import type { AttemptFailure } from '../contract/index.ts';
import {
  FAILURE_REASON_ERROR_PATTERN,
  FAILURE_REASON_MAX_CHARS,
} from '../data/data.constants.ts';
import { SUMMARY_LABEL_ELLIPSIS } from '../data/data.validation-summary.ts';
import { stripAnsi } from './strip-ansi.ts';
import { labelForCommand } from './summarize-command.ts';

const cap = (line: string): string => {
  const trimmed = line.trim();

  return trimmed.length <= FAILURE_REASON_MAX_CHARS
    ? trimmed
    : `${trimmed.slice(0, FAILURE_REASON_MAX_CHARS - 1)}${SUMMARY_LABEL_ELLIPSIS}`;
};

const nonEmptyLines = (text: string): readonly string[] => {
  return stripAnsi(text)
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line !== '');
};

/**
 * @description First non-empty line of the text, trimmed and capped; empty string when none.
 * @public
 */
export const firstLine = (text: string): string => {
  return cap(nonEmptyLines(text)[0] ?? '');
};

/**
 * @description "First error line" of a failure tail: the first line matching error / ✗ / failed /
 * FAIL, else the first non-empty line; trimmed and capped. Empty string for an empty tail.
 * @public
 */
export const firstErrorLine = (tail: string): string => {
  const lines = nonEmptyLines(tail);
  const match = lines.find((line) => FAILURE_REASON_ERROR_PATTERN.test(line));

  return cap(match ?? lines[0] ?? '');
};

/**
 * @description Why an attempt failed, for the `attempt N failed: <reason>` line and the BLOCKED
 * summary: validation names the command and its first error, worker and commit give the first line.
 * @public
 */
export const describeAttemptFailure = (failure: AttemptFailure): string => {
  if (failure.kind === 'validation') {
    const head = `${labelForCommand(failure.command)} exited ${failure.exitCode}`;
    const error = firstErrorLine(failure.tail);

    return error === '' ? head : `${head}: ${error}`;
  }

  const text = failure.kind === 'worker' ? failure.message : failure.output;

  return firstLine(text) || `${failure.kind} failed`;
};
