/**
 * Incremental newline-delimited-JSON line buffer. A subprocess's stdout arrives
 * in arbitrary chunks that split lines anywhere; this accumulates bytes and
 * emits only complete lines, holding any partial trailing line until the next
 * chunk. Blank lines are dropped. Call {@link NdjsonBuffer.flush} once the
 * stream ends to surface a final unterminated line.
 */
export class NdjsonBuffer {
  private buffer = '';

  /** Append a chunk and return any newly-completed lines (without the newline). */
  push(chunk: Buffer | string): string[] {
    this.buffer += typeof chunk === 'string' ? chunk : chunk.toString('utf8');
    const lines: string[] = [];
    let newline = this.buffer.indexOf('\n');
    while (newline !== -1) {
      const line = this.buffer.slice(0, newline).replace(/\r$/, '');
      this.buffer = this.buffer.slice(newline + 1);
      if (line.trim() !== '') {
        lines.push(line);
      }
      newline = this.buffer.indexOf('\n');
    }
    return lines;
  }

  /** Return any buffered partial line (stream ended without a trailing newline). */
  flush(): string[] {
    const remainder = this.buffer.trim();
    this.buffer = '';
    return remainder === '' ? [] : [remainder];
  }
}
