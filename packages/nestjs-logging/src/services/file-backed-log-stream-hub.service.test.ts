import { mkdtemp, writeFile } from 'node:fs/promises';
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
import { LOG_STREAM_HUB } from '../tokens/nestjs-logging.tokens';
import { FileBackedLogStreamHub } from './file-backed-log-stream-hub.service';
import { FileLogJsonlSink } from './file-log-jsonl-sink.service';

const baseRecord = (
  message: string,
  level = NESTJS_LOGGING_LEVELS.log,
): StructuredLogRecord => ({
  context: 'HubTest',
  correlationId: undefined,
  level,
  message,
  timestampIso: '2026-05-02T12:00:00.000Z',
  traceId: undefined,
});

describe('FileBackedLogStreamHub', () => {
  let logDirectory: string;

  beforeEach(async () => {
    logDirectory = await mkdtemp(path.join(os.tmpdir(), 'nestjs-logging-hub-'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const createHub = async (
    overrides: Parameters<typeof applyNestjsLoggingModuleDefaults>[0],
  ): Promise<FileBackedLogStreamHub> => {
    const resolved = applyNestjsLoggingModuleDefaults(overrides);
    const moduleRef = await Test.createTestingModule({
      providers: [
        FileBackedLogStreamHub,
        { provide: NESTJS_LOGGING_MODULE_OPTIONS, useValue: resolved },
      ],
    }).compile();

    return moduleRef.get(FileBackedLogStreamHub);
  };

  it('readReplayTailLines returns last N records from JSONL file', async () => {
    const hub = await createHub({
      fileBasename: 'tail',
      logDirectory,
      maxReplayLines: 100,
    });
    const filePath = path.join(logDirectory, 'tail.jsonl');

    await writeFile(
      filePath,
      [
        JSON.stringify({
          context: 'A',
          level: 'log',
          message: 'm1',
          timestamp: '2026-05-02T12:00:00.000Z',
        }),
        '\n',
        JSON.stringify({
          context: 'B',
          level: 'log',
          message: 'm2',
          timestamp: '2026-05-02T12:00:01.000Z',
        }),
        '\n',
        JSON.stringify({
          context: 'C',
          level: 'log',
          message: 'm3',
          timestamp: '2026-05-02T12:00:02.000Z',
        }),
        '\n',
      ].join(''),
      'utf8',
    );

    const tail = await hub.readReplayTailLines(2);

    expect(tail.map((r) => r.message)).toEqual(['m2', 'm3']);
  });

  it('readReplayFromByteOffset resumes after complete lines', async () => {
    const hub = await createHub({ logDirectory });
    const filePath = path.join(logDirectory, 'application.jsonl');
    const line1 = `${JSON.stringify({
      context: 'A',
      level: 'log',
      message: 'one',
      timestamp: '2026-05-02T12:00:00.000Z',
    })}\n`;
    const line2 = `${JSON.stringify({
      context: 'B',
      level: 'log',
      message: 'two',
      timestamp: '2026-05-02T12:00:01.000Z',
    })}\n`;

    await writeFile(filePath, line1 + line2, 'utf8');

    const first = await hub.readReplayFromByteOffset(0);

    expect(first.records.map((r) => r.message)).toEqual(['one', 'two']);
    expect(first.nextByteOffset).toBe(Buffer.byteLength(line1 + line2, 'utf8'));

    const second = await hub.readReplayFromByteOffset(first.nextByteOffset);

    expect(second.records).toHaveLength(0);
    expect(second.nextByteOffset).toBe(first.nextByteOffset);
  });

  it('publish fans out to subscribers for allowed levels', async () => {
    const hub = await createHub({
      levels: [NESTJS_LOGGING_LEVELS.log],
      logDirectory,
    });
    const seen: string[] = [];
    const unsub = hub.subscribe((r) => {
      seen.push(r.message);
    });

    hub.publish(baseRecord('a', NESTJS_LOGGING_LEVELS.log));
    hub.publish(baseRecord('hidden', NESTJS_LOGGING_LEVELS.debug));
    unsub();
    hub.publish(baseRecord('after', NESTJS_LOGGING_LEVELS.log));

    expect(seen).toEqual(['a']);
  });

  it('FileLogJsonlSink notifies hub after append', async () => {
    const resolved = applyNestjsLoggingModuleDefaults({
      levels: [NESTJS_LOGGING_LEVELS.log],
      logDirectory,
    });
    const moduleRef = await Test.createTestingModule({
      providers: [
        FileBackedLogStreamHub,
        FileLogJsonlSink,
        { provide: NESTJS_LOGGING_MODULE_OPTIONS, useValue: resolved },
        { provide: LOG_STREAM_HUB, useExisting: FileBackedLogStreamHub },
      ],
    }).compile();

    await moduleRef.init();

    const sink = moduleRef.get(FileLogJsonlSink);
    const hub = moduleRef.get(FileBackedLogStreamHub);
    const live: string[] = [];

    hub.subscribe((r) => {
      live.push(r.message);
    });

    sink.append(baseRecord('persisted'));
    await sink.flush();

    const tail = await hub.readReplayTailLines(5);

    expect(live).toEqual(['persisted']);
    expect(tail.map((t) => t.message)).toContain('persisted');

    await sink.onModuleDestroy();
  });
});
