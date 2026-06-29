import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import * as path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { KeyedJsonlWriter } from './keyed-jsonl-writer';
import {
  buildKeyedJsonlRelativePath,
  keyedJsonlPairHash8,
} from './keyed-jsonl-writer-path';
import { readKeyedJsonlRun } from './keyed-jsonl-reader';

const QUEUE = 'Plans';
const JOB = 'job-1';

const ts = (n: number): string =>
  `2026-01-01T00:00:${String(n).padStart(2, '0')}.000Z`;

describe('readKeyedJsonlRun', () => {
  let baseDir: string;

  beforeEach(async () => {
    baseDir = await mkdtemp(path.join(tmpdir(), 'keyed-jsonl-reader-'));
  });

  afterEach(async () => {
    await rm(baseDir, { force: true, recursive: true });
  });

  const writeRecords = async (
    queueName: string,
    jobId: string,
    count: number,
  ): Promise<void> => {
    const writer = new KeyedJsonlWriter({ runOutputBaseDirectory: baseDir });
    for (let i = 0; i < count; i += 1) {
      writer.appendRunChunk(queueName, jobId, {
        data: `line ${i}`,
        timestamp: ts(i),
        type: i % 2 === 0 ? 'stdout' : 'stderr',
      });
    }
    await writer.closeAll();
  };

  it('round-trips all records when limit covers the file', async () => {
    await writeRecords(QUEUE, JOB, 3);

    const result = await readKeyedJsonlRun({
      baseDirectory: baseDir,
      jobId: JOB,
      options: { limit: 10 },
      queueName: QUEUE,
    });

    expect(result.lines.map((l) => l.record.data)).toEqual([
      'line 0',
      'line 1',
      'line 2',
    ]);
    expect(result.lines.map((l) => l.lineNumber)).toEqual([0, 1, 2]);
    expect(result.hasMore).toBe(false);
    expect(result.nextLine).toBe(3);
  });

  it('pages forward by line cursor with stable hasMore', async () => {
    await writeRecords(QUEUE, JOB, 5);

    const page1 = await readKeyedJsonlRun({
      baseDirectory: baseDir,
      jobId: JOB,
      options: { limit: 2 },
      queueName: QUEUE,
    });
    expect(page1.lines.map((l) => l.record.data)).toEqual(['line 0', 'line 1']);
    expect(page1.hasMore).toBe(true);
    expect(page1.nextLine).toBe(2);

    const page2 = await readKeyedJsonlRun({
      baseDirectory: baseDir,
      jobId: JOB,
      options: { afterLine: page1.nextLine, limit: 2 },
      queueName: QUEUE,
    });
    expect(page2.lines.map((l) => l.record.data)).toEqual(['line 2', 'line 3']);
    expect(page2.hasMore).toBe(true);
    expect(page2.nextLine).toBe(4);

    const page3 = await readKeyedJsonlRun({
      baseDirectory: baseDir,
      jobId: JOB,
      options: { afterLine: page2.nextLine, limit: 2 },
      queueName: QUEUE,
    });
    expect(page3.lines.map((l) => l.record.data)).toEqual(['line 4']);
    expect(page3.hasMore).toBe(false);
    expect(page3.nextLine).toBe(5);
  });

  it('filters to records at/after sinceTimestamp', async () => {
    await writeRecords(QUEUE, JOB, 5);

    const result = await readKeyedJsonlRun({
      baseDirectory: baseDir,
      jobId: JOB,
      options: { limit: 10, sinceTimestamp: ts(3) },
      queueName: QUEUE,
    });

    expect(result.lines.map((l) => l.record.timestamp)).toEqual([ts(3), ts(4)]);
    expect(result.lines[0]?.lineNumber).toBe(3);
    expect(result.hasMore).toBe(false);
  });

  it('returns an empty page when the run file does not exist', async () => {
    const result = await readKeyedJsonlRun({
      baseDirectory: baseDir,
      jobId: 'never-ran',
      options: { afterLine: 7, limit: 10 },
      queueName: QUEUE,
    });

    expect(result.lines).toEqual([]);
    expect(result.hasMore).toBe(false);
    expect(result.nextLine).toBe(7);
  });

  it('returns an empty page for a non-positive limit', async () => {
    await writeRecords(QUEUE, JOB, 3);

    const result = await readKeyedJsonlRun({
      baseDirectory: baseDir,
      jobId: JOB,
      options: { limit: 0 },
      queueName: QUEUE,
    });

    expect(result.lines).toEqual([]);
    expect(result.hasMore).toBe(false);
  });

  it('skips malformed lines but keeps line cursors aligned to physical lines', async () => {
    const rel = buildKeyedJsonlRelativePath({
      extension: '.jsonl',
      jobId: JOB,
      queueName: QUEUE,
    });
    const abs = path.join(baseDir, rel);
    await mkdir(path.dirname(abs), { recursive: true });
    // line 0 valid, line 1 garbage, line 2 valid
    await writeFile(
      abs,
      [
        JSON.stringify({ data: 'a', timestamp: ts(0), type: 'stdout' }),
        'not-json{',
        JSON.stringify({ data: 'c', timestamp: ts(2), type: 'stdout' }),
        '',
      ].join('\n'),
      'utf8',
    );

    const result = await readKeyedJsonlRun({
      baseDirectory: baseDir,
      jobId: JOB,
      options: { limit: 10 },
      queueName: QUEUE,
    });

    expect(result.lines.map((l) => l.record.data)).toEqual(['a', 'c']);
    // 'c' is physical line index 2, not 1 — the garbage line still advanced it.
    expect(result.lines.map((l) => l.lineNumber)).toEqual([0, 2]);
  });

  it('preserves object data and the source tag', async () => {
    const writer = new KeyedJsonlWriter({ runOutputBaseDirectory: baseDir });
    writer.appendRunChunk(QUEUE, JOB, {
      data: { detail: 42, msg: 'structured' },
      source: 'workflow-ralph',
      timestamp: ts(0),
      type: 'meta',
    });
    await writer.closeAll();

    const result = await readKeyedJsonlRun({
      baseDirectory: baseDir,
      jobId: JOB,
      options: { limit: 10 },
      queueName: QUEUE,
    });

    expect(result.lines).toHaveLength(1);
    expect(result.lines[0]?.record.data).toEqual({
      detail: 42,
      msg: 'structured',
    });
    expect(result.lines[0]?.record.source).toBe('workflow-ralph');
    expect(result.lines[0]?.record.type).toBe('meta');
  });

  it('falls back to the collision-suffixed file when the default is absent', async () => {
    const rel = buildKeyedJsonlRelativePath({
      collisionJobSuffix: keyedJsonlPairHash8(QUEUE, 'collide'),
      extension: '.jsonl',
      jobId: 'collide',
      queueName: QUEUE,
    });
    const abs = path.join(baseDir, rel);
    await mkdir(path.dirname(abs), { recursive: true });
    await writeFile(
      abs,
      `${JSON.stringify({ data: 'from collision file', timestamp: ts(0), type: 'stdout' })}\n`,
      'utf8',
    );

    const result = await readKeyedJsonlRun({
      baseDirectory: baseDir,
      jobId: 'collide',
      options: { limit: 10 },
      queueName: QUEUE,
    });

    expect(result.lines.map((l) => l.record.data)).toEqual([
      'from collision file',
    ]);
  });
});
