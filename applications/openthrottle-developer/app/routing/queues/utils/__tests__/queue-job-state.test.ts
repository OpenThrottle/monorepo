import { describe, expect, test } from 'vitest';
import {
  QUEUE_JOB_STATES,
  queueJobStateColor,
  queueJobStateLabel,
} from '../queue-job-state';

describe('queueJobStateColor', () => {
  test('maps each canonical state to a stable badge color', () => {
    expect(queueJobStateColor('active')).toBe('yellow');
    expect(queueJobStateColor('completed')).toBe('green');
    expect(queueJobStateColor('delayed')).toBe('amber');
    expect(queueJobStateColor('failed')).toBe('red');
    expect(queueJobStateColor('paused')).toBe('slate');
    expect(queueJobStateColor('prioritized')).toBe('sky');
    expect(queueJobStateColor('waiting')).toBe('blue');
    expect(queueJobStateColor('waiting-children')).toBe('violet');
  });

  test('falls back to the neutral default for unknown states', () => {
    expect(queueJobStateColor('unknown')).toBe('default');
    expect(queueJobStateColor('')).toBe('default');
  });

  test('covers every canonical state', () => {
    for (const state of QUEUE_JOB_STATES) {
      expect(queueJobStateColor(state)).not.toBe('default');
    }
  });
});

describe('queueJobStateLabel', () => {
  test('renders human-readable labels for canonical states', () => {
    expect(queueJobStateLabel('active')).toBe('Active');
    expect(queueJobStateLabel('waiting-children')).toBe('Waiting on children');
    expect(queueJobStateLabel('prioritized')).toBe('Prioritized');
  });

  test('renders unknown states verbatim', () => {
    expect(queueJobStateLabel('some-future-state')).toBe('some-future-state');
  });
});
