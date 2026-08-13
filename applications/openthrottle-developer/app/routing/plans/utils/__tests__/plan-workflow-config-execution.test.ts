import { describe, expect, test } from 'vitest';
import {
  EXECUTION_BACKENDS,
  isExecutionBackend,
} from '../plan-workflow-config-execution';

describe('EXECUTION_BACKENDS', () => {
  test('lists cursor then claude in display order', () => {
    expect(EXECUTION_BACKENDS).toEqual(['cursor', 'claude']);
  });
});

describe('isExecutionBackend', () => {
  test.each(EXECUTION_BACKENDS)('accepts known backend %s', (backend) => {
    expect(isExecutionBackend(backend)).toBe(true);
  });

  test('rejects an unknown backend', () => {
    expect(isExecutionBackend('codex')).toBe(false);
  });

  test('rejects an empty string', () => {
    expect(isExecutionBackend('')).toBe(false);
  });
});
