import { describe, expect, test } from 'vitest';
import type { QueueJobLogEvent } from '~/routing/queues/hooks/useQueueJobLogs';
import { QueueJobLogLevel } from '~/__generated__/graphql';
import { formatQueueJobLogLine } from '../queue-job-log-line';

const baseEvent: QueueJobLogEvent = {
  cursor: 'cursor-1',
  jobId: 'job-1',
  level: QueueJobLogLevel.Info,
  message: 'started processing',
  queueName: 'Plans',
  source: 'worker',
  timestamp: '2026-08-12T09:00:00.000Z',
};

describe('formatQueueJobLogLine', () => {
  test('renders an ISO timestamp, upper-cased padded level, source, and message', () => {
    expect(formatQueueJobLogLine(baseEvent)).toBe(
      '2026-08-12T09:00:00.000Z INFO  worker  started processing',
    );
  });

  test('pads short level names to a fixed width of 5', () => {
    const event: QueueJobLogEvent = {
      ...baseEvent,
      level: QueueJobLogLevel.Warn,
    };
    expect(formatQueueJobLogLine(event)).toBe(
      '2026-08-12T09:00:00.000Z WARN  worker  started processing',
    );
  });

  test('does not truncate level names longer than the pad width', () => {
    const event: QueueJobLogEvent = {
      ...baseEvent,
      level: QueueJobLogLevel.Error,
    };
    expect(formatQueueJobLogLine(event)).toBe(
      '2026-08-12T09:00:00.000Z ERROR worker  started processing',
    );
  });

  test('renders an empty timestamp segment when the timestamp is not a valid date', () => {
    const event: QueueJobLogEvent = { ...baseEvent, timestamp: 'not-a-date' };
    expect(formatQueueJobLogLine(event)).toBe(
      ' INFO  worker  started processing',
    );
  });

  test('renders an empty timestamp segment when the timestamp is neither a string nor a number', () => {
    const event: QueueJobLogEvent = {
      ...baseEvent,
      timestamp: { iso: '2026-08-12T09:00:00.000Z' },
    };
    expect(formatQueueJobLogLine(event)).toBe(
      ' INFO  worker  started processing',
    );
  });

  test('accepts a numeric epoch timestamp', () => {
    const event: QueueJobLogEvent = {
      ...baseEvent,
      timestamp: Date.parse('2026-08-12T09:00:00.000Z'),
    };
    expect(formatQueueJobLogLine(event)).toBe(
      '2026-08-12T09:00:00.000Z INFO  worker  started processing',
    );
  });
});
