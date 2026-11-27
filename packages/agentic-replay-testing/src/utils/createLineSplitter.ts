/**
 * Split a byte stream into newline-delimited lines. Node built-ins only: the
 * ACP recording shim and replay bin both import it under type stripping.
 */

import { StringDecoder } from 'node:string_decoder';

/** @public */
export interface LineSplitter {
  /** Emit any unterminated trailing text as a final line. */
  readonly flush: () => void;
  readonly push: (data: Buffer) => void;
}

/** Split a byte stream into newline-delimited lines (multibyte safe). */
export function createLineSplitter(
  onLine: (line: string) => void,
): LineSplitter {
  const decoder = new StringDecoder('utf8');
  let pending = '';

  const emit = (line: string): void => {
    if (line.trim() !== '') {
      onLine(line);
    }
  };

  return {
    flush: () => {
      emit(`${pending}${decoder.end()}`);
      pending = '';
    },
    push: (data) => {
      const parts = `${pending}${decoder.write(data)}`.split('\n');
      pending = parts.pop() ?? '';
      parts.forEach(emit);
    },
  };
}
