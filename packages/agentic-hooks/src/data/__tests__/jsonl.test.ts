/**
 * Unit tests for the JSONL drain primitive (`data/jsonl`). Split out of the
 * original package-wide `lib.test.ts` so each source module owns its own spec.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { drainJsonlFile } from '../../index';

describe('drainJsonlFile', () => {
  let tmpRoot: string;
  beforeAll(() => {
    tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-drain-'));
  });
  afterAll(() => {
    fs.rmSync(tmpRoot, { force: true, recursive: true });
  });

  const seed = (name: string, lines: string[]): string => {
    const p = path.join(tmpRoot, name);
    fs.writeFileSync(p, lines.map((l) => `${l}\n`).join(''), 'utf8');
    return p;
  };
  const readLines = (p: string): string[] =>
    fs.existsSync(p)
      ? fs
          .readFileSync(p, 'utf8')
          .split('\n')
          .filter((l) => l.trim())
      : [];

  it('sends every line and removes the file on full success', async () => {
    const filePath = seed('ok.jsonl', ['{"a":1}', '{"a":2}']);
    const res = await drainJsonlFile({
      filePath,
      post: async () => ({ ok: true }),
    });
    expect(res).toEqual({ retained: 0, sent: 2, skipped: 0 });
    expect(fs.existsSync(filePath)).toBe(false);
  });

  it('retains everything when the server is down (nothing lost)', async () => {
    const filePath = seed('down.jsonl', ['{"a":1}', '{"a":2}']);
    const res = await drainJsonlFile({
      filePath,
      post: async () => ({ ok: false, reason: 'timeout' }),
    });
    expect(res).toEqual({ retained: 2, sent: 0, skipped: 0 });
    expect(readLines(filePath)).toEqual(['{"a":1}', '{"a":2}']);
  });

  it('retains only the failed lines on partial success', async () => {
    const filePath = seed('partial.jsonl', ['{"a":1}', '{"a":2}', '{"a":3}']);
    const res = await drainJsonlFile<{ a: number }>({
      filePath,
      post: async (event) => ({ ok: event.a === 1 }),
    });
    expect(res.sent).toBe(1);
    expect(res.retained).toBe(2);
    expect(
      readLines(filePath)
        .map((l) => JSON.parse(l).a)
        .sort(),
    ).toEqual([2, 3]);
  });

  it('skips (drops) malformed lines, logs, and is not fatal', async () => {
    const filePath = seed('malformed.jsonl', [
      '{"a":1}',
      'not-json',
      '{"a":2}',
    ]);
    const res = await drainJsonlFile({
      filePath,
      post: async () => ({ ok: true }),
    });
    expect(res.sent).toBe(2);
    expect(res.skipped).toBe(1);
    expect(res.retained).toBe(0);
    expect(fs.existsSync(filePath)).toBe(false);
  });

  it('honors the deadline, retaining not-yet-posted lines', async () => {
    const filePath = seed('deadline.jsonl', ['{"a":1}', '{"a":2}']);
    let posted = 0;
    const res = await drainJsonlFile({
      deadlineMs: 1000,
      filePath,
      nowFn: () => 2000,
      post: async () => {
        posted += 1;
        return { ok: true };
      },
    });
    expect(posted).toBe(0);
    expect(res.sent).toBe(0);
    expect(res.retained).toBe(2);
    expect(readLines(filePath)).toEqual(['{"a":1}', '{"a":2}']);
  });

  it('returns zeros when the file does not exist', async () => {
    const res = await drainJsonlFile({
      filePath: path.join(tmpRoot, 'missing.jsonl'),
      post: async () => ({ ok: true }),
    });
    expect(res).toEqual({ retained: 0, sent: 0, skipped: 0 });
  });
});
