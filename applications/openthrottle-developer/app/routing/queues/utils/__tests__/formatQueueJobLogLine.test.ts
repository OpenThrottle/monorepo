import { describe, expect, test } from 'vitest';

import type { QueueJobLogEventFragment } from '~/__generated__/graphql';
import { QueueJobLogLevel } from '~/__generated__/graphql';

import { formatQueueJobLogLine } from '../formatQueueJobLogLine';

const baseEvent: QueueJobLogEventFragment = {
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
    const event: QueueJobLogEventFragment = {
      ...baseEvent,
      level: QueueJobLogLevel.Warn,
    };
    expect(formatQueueJobLogLine(event)).toBe(
      '2026-08-12T09:00:00.000Z WARN  worker  started processing',
    );
  });

  test('does not truncate level names longer than the pad width', () => {
    const event: QueueJobLogEventFragment = {
      ...baseEvent,
      level: QueueJobLogLevel.Error,
    };
    expect(formatQueueJobLogLine(event)).toBe(
      '2026-08-12T09:00:00.000Z ERROR worker  started processing',
    );
  });

  test('renders an empty timestamp segment when the timestamp is not a valid date', () => {
    const event: QueueJobLogEventFragment = {
      ...baseEvent,
      timestamp: 'not-a-date',
    };
    expect(formatQueueJobLogLine(event)).toBe(
      ' INFO  worker  started processing',
    );
  });

  test('renders an empty timestamp segment when the timestamp is neither a string nor a number', () => {
    const event: QueueJobLogEventFragment = {
      ...baseEvent,
      timestamp: { iso: '2026-08-12T09:00:00.000Z' },
    };
    expect(formatQueueJobLogLine(event)).toBe(
      ' INFO  worker  started processing',
    );
  });

  test('accepts a numeric epoch timestamp', () => {
    const event: QueueJobLogEventFragment = {
      ...baseEvent,
      timestamp: Date.parse('2026-08-12T09:00:00.000Z'),
    };
    expect(formatQueueJobLogLine(event)).toBe(
      '2026-08-12T09:00:00.000Z INFO  worker  started processing',
    );
  });
});
