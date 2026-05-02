import { mkdtemp, readFile, readdir } from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { Test } from '@nestjs/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  applyNestjsLoggingModuleDefaults,
  NESTJS_LOGGING_MODULE_OPTIONS,
} from '../config/nestjs-logging.options';
import { NESTJS_LOGGING_LEVELS } from '../config/nestjs-logging-levels';
import type { StructuredLogRecord } from '../ports/logging-ports';
import { FileLogJsonlSink } from './file-log-jsonl-sink.service';

const baseRecord = (
  message: string,
  level = NESTJS_LOGGING_LEVELS.log,
): StructuredLogRecord => ({
  context: 'Test',
  correlationId: undefined,
  level,
  message,
  timestampIso: '2026-05-02T12:00:00.000Z',
  traceId: undefined,
});

describe('FileLogJsonlSink', () => {
  let logDirectory: string;

  beforeEach(async () => {
    logDirectory = await mkdtemp(
      path.join(os.tmpdir(), 'nestjs-logging-sink-'),
    );
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const createSink = async (
    overrides: Parameters<typeof applyNestjsLoggingModuleDefaults>[0],
  ): Promise<FileLogJsonlSink> => {
    const resolved = applyNestjsLoggingModuleDefaults(overrides);
    const moduleRef = await Test.createTestingModule({
      providers: [
        FileLogJsonlSink,
        { provide: NESTJS_LOGGING_MODULE_OPTIONS, useValue: resolved },
      ],
    }).compile();

    await moduleRef.init();
    return moduleRef.get(FileLogJsonlSink);
  };

  it('appends correlationId and traceId when present on the record', async () => {
    const sink = await createSink({ logDirectory });

    sink.append({
      ...baseRecord('with ids'),
      correlationId: 'corr-1',
      traceId: 'trace-9',
    });
    await sink.flush();

    const text = await readFile(
      path.join(logDirectory, 'application.jsonl'),
      'utf8',
    );
    const parsed = JSON.parse(text.trim().split('\n')[0] ?? '{}');

    expect(parsed).toMatchObject({
      correlationId: 'corr-1',
      message: 'with ids',
      traceId: 'trace-9',
    });
    await sink.onModuleDestroy();
  });

  it('appends spanId, pid, hostname, and extra when present on the record', async () => {
    const sink = await createSink({ logDirectory });

    sink.append({
      ...baseRecord('rich optional fields'),
      extra: { detail: 'x', nested: { n: 1 } },
      hostname: 'worker-1.example',
      pid: 4242,
      spanId: 'span-abc',
    });
    await sink.flush();

    const text = await readFile(
      path.join(logDirectory, 'application.jsonl'),
      'utf8',
    );
    const parsed = JSON.parse(text.trim().split('\n')[0] ?? '{}');

    expect(parsed).toMatchObject({
      extra: { detail: 'x', nested: { n: 1 } },
      hostname: 'worker-1.example',
      message: 'rich optional fields',
      pid: 4242,
      spanId: 'span-abc',
      timestamp: '2026-05-02T12:00:00.000Z',
    });
    await sink.onModuleDestroy();
  });

  it('appends JSONL lines and respects level filter', async () => {
    const sink = await createSink({
      levels: [NESTJS_LOGGING_LEVELS.log],
      logDirectory,
    });

    sink.append(baseRecord('visible', NESTJS_LOGGING_LEVELS.log));
    sink.append(baseRecord('hidden', NESTJS_LOGGING_LEVELS.debug));
    await sink.flush();

    const text = await readFile(
      path.join(logDirectory, 'application.jsonl'),
      'utf8',
    );
    const lines = text.trimEnd().split('\n');

    expect(lines).toHaveLength(1);
    expect(JSON.parse(lines[0] ?? '{}')).toMatchObject({ message: 'visible' });
    await sink.onModuleDestroy();
  });

  it('uses fileNamePattern basename when rotation is none', async () => {
    const sink = await createSink({
      fileNamePattern: 'custom-name.jsonl',
      logDirectory,
    });

    sink.append(baseRecord('one'));
    await sink.flush();

    const text = await readFile(
      path.join(logDirectory, 'custom-name.jsonl'),
      'utf8',
    );

    expect(text.trim().length).toBeGreaterThan(0);
    await sink.onModuleDestroy();
  });

  it('rotates by size and keeps numbered archives', async () => {
    const sink = await createSink({
      fileBasename: 'svc',
      logDirectory,
      rotation: { keepFiles: 2, maxBytes: 80, type: 'size' },
    });

    for (let i = 0; i < 6; i += 1) {
      sink.append(baseRecord(`message-${i}`));
    }

    await sink.flush();
    await sink.onModuleDestroy();

    const names = (await readdir(logDirectory)).sort();

    expect(names.some((n) => n === 'svc.jsonl')).toBe(true);
    expect(names.some((n) => n === 'svc.1.jsonl')).toBe(true);
  });

  it('writes a new daily file when the UTC date changes', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-02T10:00:00.000Z'));

    const sink = await createSink({
      fileBasename: 'daily',
      logDirectory,
      rotation: { maxFiles: 10, type: 'daily' },
    });

    sink.append(baseRecord('day-one'));
    await sink.flush();

    vi.setSystemTime(new Date('2026-05-03T10:00:00.000Z'));
    sink.append(baseRecord('day-two'));
    await sink.flush();
    await sink.onModuleDestroy();

    const d1 = await readFile(
      path.join(logDirectory, 'daily.2026-05-02.jsonl'),
      'utf8',
    );
    const d2 = await readFile(
      path.join(logDirectory, 'daily.2026-05-03.jsonl'),
      'utf8',
    );

    expect(d1).toContain('day-one');
    expect(d2).toContain('day-two');
  });
});
