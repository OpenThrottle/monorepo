/**
 * @description Opaque forward cursor for the Phase 1 log tail API (OT plan
 * 3c397432). Encodes the physical line index of a keyed run-output file (see
 * `readKeyedJsonlRun`) as a base64url token so clients treat it as opaque and the
 * server can resume a page without re-scanning returned lines. Append-only files
 * make the line index a stable cursor.
 */

import { isRecord } from '@openthrottle/nodejs-utils';

const CURSOR_VERSION = 1;

/**
 * @description Encode a 0-based line index as an opaque cursor token.
 */
export const encodeQueueJobLogCursor = (line: number): string =>
  Buffer.from(JSON.stringify({ line, v: CURSOR_VERSION }), 'utf8').toString(
    'base64url',
  );

/**
 * @description Decode an opaque cursor token back to its line index, or
 * `undefined` when the token is malformed, the wrong version, or carries a
 * non-integer/negative line — callers treat `undefined` as "start from the
 * beginning" / a client error, never as a crash.
 */
export const decodeQueueJobLogCursor = (cursor: string): number | undefined => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8'));
  } catch {
    return undefined;
  }

  if (!isRecord(parsed) || parsed.v !== CURSOR_VERSION) {
    return undefined;
  }

  const line = parsed.line;
  if (typeof line !== 'number' || !Number.isInteger(line) || line < 0) {
    return undefined;
  }

  return line;
};
