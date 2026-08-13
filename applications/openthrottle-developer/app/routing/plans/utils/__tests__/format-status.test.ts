import { describe, expect, test } from 'vitest';
import { formatPlanTaskStatus } from '../format-status';

describe('formatPlanTaskStatus', () => {
  test('maps a known status key to its human-readable label', () => {
    expect(formatPlanTaskStatus('IN_PROGRESS')).toBe('In Progress');
  });

  test('maps every known status key without falling back', () => {
    expect(formatPlanTaskStatus('BACKLOG')).toBe('Backlog');
    expect(formatPlanTaskStatus('BLOCKED')).toBe('Blocked');
    expect(formatPlanTaskStatus('CANCELED')).toBe('Canceled');
    expect(formatPlanTaskStatus('COMPLETED')).toBe('Completed');
    expect(formatPlanTaskStatus('PENDING')).toBe('Pending');
    expect(formatPlanTaskStatus('QUEUED')).toBe('Queued');
    expect(formatPlanTaskStatus('SKIPPED')).toBe('Skipped');
  });

  test('falls back to the raw value for an unknown status', () => {
    expect(formatPlanTaskStatus('SOMETHING_UNKNOWN')).toBe('SOMETHING_UNKNOWN');
  });
});
