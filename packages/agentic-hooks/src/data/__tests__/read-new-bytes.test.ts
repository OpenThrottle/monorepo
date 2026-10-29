/**
 * Incremental reads: only complete lines are consumed, and the offset is bytes.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { readNewBytes } from '../../index.ts';

describe('readNewBytes', () => {
  let tmpRoot: string;
  let filePath: string;

  beforeEach(() => {
    tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'read-new-bytes-'));
    filePath = path.join(tmpRoot, 'log.jsonl');
  });

  afterEach(() => {
    fs.rmSync(tmpRoot, { force: true, recursive: true });
  });

  it('reads every complete line from offset 0', () => {
    fs.writeFileSync(filePath, 'one\ntwo\n');
    expect(readNewBytes({ filePath, offset: 0 })).toEqual({
      lines: ['one', 'two'],
      nextOffset: 8,
    });
  });

  it('reads only the bytes appended after the offset', () => {
    fs.writeFileSync(filePath, 'one\ntwo\n');
    fs.appendFileSync(filePath, 'three\n');
    expect(readNewBytes({ filePath, offset: 8 })).toEqual({
      lines: ['three'],
      nextOffset: 14,
    });
  });

  it('returns nothing when there is nothing new', () => {
    fs.writeFileSync(filePath, 'one\n');
    expect(readNewBytes({ filePath, offset: 4 })).toEqual({
      lines: [],
      nextOffset: 4,
    });
  });

  describe('when the last line is still being written', () => {
    it('does not consume the partial line and re-reads it once complete', () => {
      fs.writeFileSync(filePath, 'one\ntwo\npart');
      const first = readNewBytes({ filePath, offset: 0 });
      expect(first).toEqual({ lines: ['one', 'two'], nextOffset: 8 });

      fs.appendFileSync(filePath, 'ial\n');
      expect(readNewBytes({ filePath, offset: first.nextOffset })).toEqual({
        lines: ['partial'],
        nextOffset: 16,
      });
    });

    it('keeps the offset when the only new bytes are a partial line', () => {
      fs.writeFileSync(filePath, 'one\npart');
      expect(readNewBytes({ filePath, offset: 4 })).toEqual({
        lines: [],
        nextOffset: 4,
      });
    });
  });

  describe('when the file was truncated', () => {
    it('restarts at 0 if the file is smaller than the offset', () => {
      fs.writeFileSync(filePath, 'a\nb\n');
      expect(readNewBytes({ filePath, offset: 100 })).toEqual({
        lines: ['a', 'b'],
        nextOffset: 4,
      });
    });
  });

  it('counts bytes, not characters, for multi-byte text', () => {
    fs.writeFileSync(filePath, 'héllo\nwörld\n');
    const first = readNewBytes({ filePath, offset: 0 });
    expect(first.lines).toEqual(['héllo', 'wörld']);
    expect(first.nextOffset).toBe(Buffer.byteLength('héllo\nwörld\n'));
  });

  it('drops blank lines and strips carriage returns', () => {
    fs.writeFileSync(filePath, 'a\r\n\n  \nb\n');
    expect(readNewBytes({ filePath, offset: 0 }).lines).toEqual(['a', 'b']);
  });

  it('fails open on a missing file, keeping the offset', () => {
    expect(
      readNewBytes({ filePath: path.join(tmpRoot, 'nope'), offset: 7 }),
    ).toEqual({ lines: [], nextOffset: 7 });
  });
});
