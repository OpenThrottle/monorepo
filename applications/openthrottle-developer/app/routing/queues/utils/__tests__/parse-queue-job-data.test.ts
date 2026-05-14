import { describe, expect, test } from 'vitest';
import { parseQueueJobDataString } from '../parse-queue-job-data';

describe('parseQueueJobDataString', () => {
  test('returns empty fields for null/empty data', () => {
    expect(parseQueueJobDataString(null)).toEqual({
      correlationId: undefined,
      mode: undefined,
      parseError: null,
      planId: undefined,
      prettyJson: null,
      runKind: undefined,
      taskId: undefined,
    });
    expect(parseQueueJobDataString('')).toEqual({
      correlationId: undefined,
      mode: undefined,
      parseError: null,
      planId: undefined,
      prettyJson: null,
      runKind: undefined,
      taskId: undefined,
    });
  });

  test('extracts plan, task, runKind, and mode from valid JSON', () => {
    const raw = JSON.stringify({
      mode: 'task',
      planId: 'p-1',
      runKind: 'orchestrator',
      taskId: 't-1',
    });
    const r = parseQueueJobDataString(raw);
    expect(r.planId).toBe('p-1');
    expect(r.taskId).toBe('t-1');
    expect(r.runKind).toBe('orchestrator');
    expect(r.mode).toBe('task');
    expect(r.parseError).toBeNull();
    expect(r.prettyJson).toContain('"planId"');
  });

  test('extracts optional correlationId from JSON', () => {
    const raw = JSON.stringify({ correlationId: 'req-99', planId: 'p-1' });
    const r = parseQueueJobDataString(raw);
    expect(r.correlationId).toBe('req-99');
  });

  test('sets parseError for invalid JSON and keeps raw string in prettyJson', () => {
    const r = parseQueueJobDataString('not-json');
    expect(r.parseError).toBe('Invalid JSON');
    expect(r.prettyJson).toBe('not-json');
  });
});
