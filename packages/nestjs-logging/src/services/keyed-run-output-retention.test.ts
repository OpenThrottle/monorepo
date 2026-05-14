import { mkdir, mkdtemp, stat, utimes, writeFile } from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';
import { pruneKeyedRunOutputDirectory } from './keyed-run-output-retention';

const mkBase = async (): Promise<string> =>
  mkdtemp(path.join(os.tmpdir(), 'keyed-ret-'));

describe('pruneKeyedRunOutputDirectory', () => {
  it('returns zeros when neither maxAgeMs nor maxTotalBytes is set', async () => {
    const base = await mkBase();
    const r = await pruneKeyedRunOutputDirectory({
      baseDirectory: base,
    });

    expect(r).toEqual({
      deletedFileCount: 0,
      freedBytes: 0,
      remainingTotalBytes: 0,
      skippedUnlinkErrors: 0,
    });
  });

  it('deletes files older than maxAgeMs', async () => {
    const base = await mkBase();
    const q = path.join(base, 'plans');
    await mkdir(q, { recursive: true });
    const oldFile = path.join(q, 'old.jsonl');
    const newFile = path.join(q, 'new.jsonl');

    await writeFile(oldFile, 'x\n', 'utf8');
    await writeFile(newFile, 'y\n', 'utf8');
    const t0 = Date.UTC(2019, 0, 1);
    const tNew = t0 + 200_000;
    const nowMs = t0 + 250_000;

    await utimes(oldFile, new Date(t0), new Date(t0));
    await utimes(newFile, new Date(tNew), new Date(tNew));

    const r = await pruneKeyedRunOutputDirectory({
      baseDirectory: base,
      maxAgeMs: 90_000,
      nowMs,
    });

    expect(r.deletedFileCount).toBe(1);
    expect(r.freedBytes).toBeGreaterThan(0);
    await expect(stat(oldFile)).rejects.toThrow();
    await expect(stat(newFile)).resolves.toBeDefined();
    expect(r.skippedUnlinkErrors).toBe(0);
  });

  it('deletes oldest files when over maxTotalBytes', async () => {
    const base = await mkBase();
    const q = path.join(base, 'q');
    await mkdir(q, { recursive: true });
    const a = path.join(q, 'a.jsonl');
    const b = path.join(q, 'b.jsonl');
    const c = path.join(q, 'c.jsonl');

    await writeFile(a, 'aa', 'utf8');
    await writeFile(b, 'bb', 'utf8');
    await writeFile(c, 'cc', 'utf8');

    const t0 = Date.UTC(2020, 0, 1);
    const t1 = t0 + 10_000;
    const t2 = t0 + 20_000;

    await utimes(a, new Date(t0), new Date(t0));
    await utimes(b, new Date(t1), new Date(t1));
    await utimes(c, new Date(t2), new Date(t2));

    const r = await pruneKeyedRunOutputDirectory({
      baseDirectory: base,
      maxTotalBytes: 3,
      nowMs: t2 + 1,
    });

    expect(r.deletedFileCount).toBe(2);
    expect(r.remainingTotalBytes).toBeLessThanOrEqual(3);
  });

  it('ignores non-run-output extensions', async () => {
    const base = await mkBase();

    await writeFile(path.join(base, 'x.txt'), 'hello', 'utf8');

    const r = await pruneKeyedRunOutputDirectory({
      baseDirectory: base,
      maxAgeMs: 1,
      nowMs: Date.now() + 9_999_999,
    });

    expect(r.deletedFileCount).toBe(0);
  });
});
