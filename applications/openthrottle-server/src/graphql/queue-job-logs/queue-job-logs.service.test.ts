import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import * as path from 'node:path';
import { KeyedJsonlWriter } from '@openthrottle/nestjs-logging';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { decodeQueueJobLogCursor } from './queue-job-log-cursor';
import { QueueJobLogsService } from './queue-job-logs.service';
import type { QueueJobLogsInput } from './queue-job-logs.input';

const QUEUE = 'plans-queue';
const JOB = 'job-1';

const baseInput = (
  overrides: Partial<QueueJobLogsInput> = {},
): QueueJobLogsInput => ({
  after: null,
  jobId: JOB,
  levelIn: null,
  limit: null,
  queueName: QUEUE,
  since: null,
  ...overrides,
});

describe('QueueJobLogsService', () => {
  const service = new QueueJobLogsService();
  let dir: string | undefined;
  const originalEnv = process.env.BULLMQ_RUN_OUTPUT_DIR;

  const writeRun = async (
    chunks: ReadonlyArray<{
      data: string | Record<string, unknown>;
      source?: string;
      timestamp: string;
      type: string;
    }>,
  ): Promise<void> => {
    const writer = new KeyedJsonlWriter({ runOutputBaseDirectory: dir! });
    for (const chunk of chunks) {
      writer.appendRunChunk(QUEUE, JOB, chunk);
    }
    await writer.close(QUEUE, JOB);
  };

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), 'qjl-'));
    process.env.BULLMQ_RUN_OUTPUT_DIR = dir;
  });

  afterEach(async () => {
    if (originalEnv === undefined) {
      delete process.env.BULLMQ_RUN_OUTPUT_DIR;
    } else {
      process.env.BULLMQ_RUN_OUTPUT_DIR = originalEnv;
    }
    if (dir !== undefined) {
      await rm(dir, { force: true, recursive: true });
    }
  });

  it('returns an empty page when BULLMQ_RUN_OUTPUT_DIR is unset', async () => {
    delete process.env.BULLMQ_RUN_OUTPUT_DIR;
    const page = await service.read(baseInput());
    expect(page).toEqual({ events: [], hasMore: false, nextCursor: null });
  });

  it('returns an empty page when the job never wrote output', async () => {
    const page = await service.read(baseInput());
    expect(page).toEqual({ events: [], hasMore: false, nextCursor: null });
  });

  it('maps records to derived levels, source fallback, and per-event cursors', async () => {
    await writeRun([
      {
        data: 'meta line',
        timestamp: '2026-05-04T23:00:00.000Z',
        type: 'meta',
      },
      {
        data: 'building project',
        source: 'workflow-ralph',
        timestamp: '2026-05-04T23:00:01.000Z',
        type: 'stdout',
      },
      {
        data: 'a warning',
        timestamp: '2026-05-04T23:00:02.000Z',
        type: 'stderr',
      },
      {
        data: { level: 'error', message: 'boom' },
        timestamp: '2026-05-04T23:00:03.000Z',
        type: 'stdout',
      },
    ]);

    const page = await service.read(baseInput());

    expect(page.events.map((event) => event.level)).toEqual([
      'debug',
      'info',
      'warn',
      'error',
    ]);
    // source falls back to the queue name when the record carries none
    expect(page.events[0]?.source).toBe(QUEUE);
    expect(page.events[1]?.source).toBe('workflow-ralph');
    expect(page.events[3]?.message).toBe('boom');
    // first event's cursor resumes AFTER line 0 → line index 1
    expect(decodeQueueJobLogCursor(page.events[0]!.cursor)).toBe(1);
    expect(page.hasMore).toBe(false);
    expect(page.nextCursor).toBeNull();
  });

  it('redacts secrets so they never appear in emitted events (task 6)', async () => {
    await writeRun([
      {
        data: 'curl -H "Authorization: Bearer sk-LIVE-secret-123" api',
        timestamp: '2026-05-04T23:00:00.000Z',
        type: 'stdout',
      },
    ]);

    const page = await service.read(baseInput());
    const serialized = JSON.stringify(page);
    expect(serialized).not.toContain('sk-LIVE-secret-123');
    expect(page.events[0]?.message).toContain('[REDACTED]');
  });

  it('filters by levelIn after derivation', async () => {
    await writeRun([
      { data: 'out', timestamp: '2026-05-04T23:00:00.000Z', type: 'stdout' },
      { data: 'err', timestamp: '2026-05-04T23:00:01.000Z', type: 'stderr' },
    ]);

    const page = await service.read(baseInput({ levelIn: ['warn'] }));
    expect(page.events).toHaveLength(1);
    expect(page.events[0]?.level).toBe('warn');
  });

  it('treats an omitted levelIn (undefined) as no filter', async () => {
    // GraphQL delivers an omitted nullable field as `undefined`, not `null`
    // (the developer app's QueueJobLogs query never sends levelIn). The guard
    // must handle both, or `undefined.length` crashes the resolver.
    await writeRun([
      { data: 'out', timestamp: '2026-05-04T23:00:00.000Z', type: 'stdout' },
      { data: 'err', timestamp: '2026-05-04T23:00:01.000Z', type: 'stderr' },
    ]);

    const page = await service.read(baseInput({ levelIn: undefined }));
    expect(page.events.map((event) => event.message)).toEqual(['out', 'err']);
  });

  it('reads a page when every optional field is omitted (undefined)', async () => {
    // The real GraphQL runtime shape: nullable fields the client never sends
    // arrive as `undefined`, not `null`. Every guard must tolerate that.
    await writeRun([
      { data: 'out', timestamp: '2026-05-04T23:00:00.000Z', type: 'stdout' },
    ]);

    const page = await service.read({
      after: undefined,
      jobId: JOB,
      levelIn: undefined,
      limit: undefined,
      queueName: QUEUE,
      since: undefined,
    });
    expect(page.events.map((event) => event.message)).toEqual(['out']);
    expect(page.hasMore).toBe(false);
  });

  it('pages by cursor and reports hasMore', async () => {
    await writeRun([
      { data: 'one', timestamp: '2026-05-04T23:00:00.000Z', type: 'stdout' },
      { data: 'two', timestamp: '2026-05-04T23:00:01.000Z', type: 'stdout' },
      { data: 'three', timestamp: '2026-05-04T23:00:02.000Z', type: 'stdout' },
    ]);

    const first = await service.read(baseInput({ limit: 2 }));
    expect(first.events.map((event) => event.message)).toEqual(['one', 'two']);
    expect(first.hasMore).toBe(true);
    expect(first.nextCursor).not.toBeNull();

    const second = await service.read(baseInput({ after: first.nextCursor }));
    expect(second.events.map((event) => event.message)).toEqual(['three']);
    expect(second.hasMore).toBe(false);
    expect(second.nextCursor).toBeNull();
  });

  it('filters out records before `since`', async () => {
    await writeRun([
      { data: 'old', timestamp: '2026-05-04T23:00:00.000Z', type: 'stdout' },
      { data: 'new', timestamp: '2026-05-04T23:05:00.000Z', type: 'stdout' },
    ]);

    const page = await service.read(
      baseInput({ since: new Date('2026-05-04T23:01:00.000Z') }),
    );
    expect(page.events.map((event) => event.message)).toEqual(['new']);
  });

  it('rejects `since` and `after` together', async () => {
    await expect(
      service.read(baseInput({ after: 'whatever', since: new Date() })),
    ).rejects.toThrow(/mutually exclusive/);
  });

  it('rejects a malformed `after` cursor', async () => {
    await expect(
      service.read(baseInput({ after: 'not-a-cursor!!!' })),
    ).rejects.toThrow(/malformed/);
  });
});
