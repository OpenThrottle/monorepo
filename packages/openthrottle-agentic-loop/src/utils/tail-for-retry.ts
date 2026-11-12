import {
  FAILURE_TAIL_MAX_BYTES,
  FAILURE_TAIL_MAX_LINES,
} from '../data/data.constants.ts';
import { stripAnsi } from './strip-ansi.ts';

const REPLACEMENT_CHAR = String.fromCharCode(0xfffd);

/**
 * @description Failure tail for a retry prompt (§ 6): ANSI stripped, last 200 lines, capped at 16 KB.
 * @public
 */
export const tailForRetry = (output: string): string => {
  const clean = stripAnsi(output);
  const lines = clean.split('\n').slice(-FAILURE_TAIL_MAX_LINES);
  const joined = lines.join('\n');
  const bytes = Buffer.from(joined, 'utf8');

  if (bytes.length <= FAILURE_TAIL_MAX_BYTES) {
    return joined;
  }

  const kept = bytes
    .subarray(bytes.length - FAILURE_TAIL_MAX_BYTES)
    .toString('utf8');

  return kept.startsWith(REPLACEMENT_CHAR) ? kept.slice(1) : kept;
};
