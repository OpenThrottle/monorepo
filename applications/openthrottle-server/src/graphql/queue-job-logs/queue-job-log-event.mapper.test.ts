import { describe, expect, it } from 'vitest';
import { mapRecordToQueueJobLogEvent } from './queue-job-log-event.mapper';

const TS = '2026-05-04T23:00:00.000Z';

describe('mapRecordToQueueJobLogEvent', () => {
  it('maps a string stdout record to a fully-populated event', () => {
    const event = mapRecordToQueueJobLogEvent({
      cursor: 'CURSOR',
      jobId: 'job-1',
      queueName: 'plans-queue',
      record: { data: '  hello world  ', timestamp: TS, type: 'stdout' },
    });

    expect(event).toEqual({
      cursor: 'CURSOR',
      jobId: 'job-1',
      level: 'info',
      message: 'hello world',
      queueName: 'plans-queue',
      source: 'plans-queue',
      timestamp: new Date(TS),
    });
  });

  it('prefers an explicit source and a structured level', () => {
    const event = mapRecordToQueueJobLogEvent({
      cursor: 'c',
      jobId: 'job-1',
      queueName: 'plans-queue',
      record: {
        data: { level: 'error', message: 'boom' },
        source: 'workflow-ralph',
        timestamp: TS,
        type: 'stdout',
      },
    });

    expect(event.level).toBe('error');
    expect(event.message).toBe('boom');
    expect(event.source).toBe('workflow-ralph');
  });

  it('redacts credentials from the message (shared redactor)', () => {
    const event = mapRecordToQueueJobLogEvent({
      cursor: 'c',
      jobId: 'job-1',
      queueName: 'plans-queue',
      record: {
        data: 'run with Authorization: Bearer sk-LIVE-secret-123 done',
        timestamp: TS,
        type: 'stderr',
      },
    });

    expect(event.message).not.toContain('sk-LIVE-secret-123');
    expect(event.message).toContain('[REDACTED]');
    // stderr is not blanket-mapped to error.
    expect(event.level).toBe('warn');
  });
});
