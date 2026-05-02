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

  it('readReplayTailLines returns an empty array when the active file is missing', async () => {
    const hub = await createHub({ logDirectory, maxReplayLines: 10 });
    const tail = await hub.readReplayTailLines(5);

    expect(tail).toEqual([]);
  });

  it('readReplayFromByteOffset returns empty records when the active file is missing', async () => {
    const hub = await createHub({ logDirectory });
    const chunk = await hub.readReplayFromByteOffset(0);

    expect(chunk.records).toEqual([]);
    expect(chunk.nextByteOffset).toBe(0);
  });

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

  it('readReplayTailLines parses minimal JSONL without context as empty context', async () => {
    const hub = await createHub({
      fileBasename: 'minimal',
      logDirectory,
      maxReplayLines: 100,
    });
    const line = JSON.stringify({
      level: 'log',
      message: 'no explicit context',
      timestamp: '2026-05-02T12:00:00.000Z',
    });

    await writeFile(
      path.join(logDirectory, 'minimal.jsonl'),
      `${line}\n`,
      'utf8',
    );

    const tail = await hub.readReplayTailLines(5);

    expect(tail).toHaveLength(1);
    expect(tail[0]?.context).toBe('');
    expect(tail[0]?.message).toBe('no explicit context');
    expect(tail[0]?.level).toBe(NESTJS_LOGGING_LEVELS.log);
  });

  it('readReplayTailLines preserves spanId, pid, hostname, and extra from JSONL', async () => {
    const hub = await createHub({
      fileBasename: 'rich',
      logDirectory,
      maxReplayLines: 100,
    });
    const line = JSON.stringify({
      context: 'Svc',
      extra: { k: 'v' },
      hostname: 'host.local',
      level: 'log',
      message: 'full shape',
      pid: 9001,
      spanId: 's-1',
      timestamp: '2026-05-02T12:00:00.000Z',
    });

    await writeFile(path.join(logDirectory, 'rich.jsonl'), `${line}\n`, 'utf8');

    const tail = await hub.readReplayTailLines(5);

    expect(tail).toHaveLength(1);
    expect(tail[0]).toMatchObject({
      context: 'Svc',
      extra: { k: 'v' },
      hostname: 'host.local',
      level: NESTJS_LOGGING_LEVELS.log,
      message: 'full shape',
      pid: 9001,
      spanId: 's-1',
      timestampIso: '2026-05-02T12:00:00.000Z',
    });
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

  it('readReplayTailLines skips a leading partial line when the read window starts mid-line', async () => {
    const hub = await createHub({
      fileBasename: 'partial',
      logDirectory,
      maxReplayBytes: 120,
      maxReplayLines: 10,
    });
    const good = `${JSON.stringify({
      context: 'X',
      level: 'log',
      message: 'ok',
      timestamp: '2026-05-02T12:00:00.000Z',
    })}\n`;
    const prefix = `${'x'.repeat(200)}\n`;

    await writeFile(
      path.join(logDirectory, 'partial.jsonl'),
      prefix + good,
      'utf8',
    );

    const tail = await hub.readReplayTailLines(5);

    expect(tail.map((r) => r.message)).toEqual(['ok']);
  });

  it('publish isolates subscriber errors so other listeners still receive records', async () => {
    const hub = await createHub({ logDirectory });
    const ok: string[] = [];

    hub.subscribe(() => {
      throw new Error('boom');
    });
    hub.subscribe((r) => {
      ok.push(r.message);
    });

    hub.publish(baseRecord('x'));

    expect(ok).toEqual(['x']);
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

  it('FileLogJsonlSink append + flush optional fields match hub tail replay', async () => {
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

    sink.append({
      ...baseRecord('optional round-trip'),
      extra: { flag: true },
      hostname: 'hub-int.local',
      pid: 77,
      spanId: 'hub-span',
    });
    await sink.flush();

    const replayed = await hub.readReplayTailLines(5);

    expect(replayed.some((r) => r.message === 'optional round-trip')).toBe(
      true,
    );
    const row = replayed.find((r) => r.message === 'optional round-trip');

    expect(row).toMatchObject({
      extra: { flag: true },
      hostname: 'hub-int.local',
      pid: 77,
      spanId: 'hub-span',
    });

    await sink.onModuleDestroy();
  });
});
