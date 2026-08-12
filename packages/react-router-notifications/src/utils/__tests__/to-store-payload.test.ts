import { describe, expect, test } from 'vitest';
import { toStorePayload } from '../to-store-payload';

describe('toStorePayload', () => {
  test('wraps the node under `event`/`payload`, keeping payload as the same object reference', () => {
    const node = {
      event: 'plan.updated',
      link: '/plans/1',
      message: 'Plan updated',
      planId: 'plan-1',
      severity: 'info',
      timestamp: '2026-08-12T12:00:00.000Z',
    };

    const result = toStorePayload(node);

    expect(result.event).toBe('plan.updated');
    expect(result.payload).toBe(node);
  });

  test('handles nodes with only the required `event` field (optional fields absent)', () => {
    const node = { event: 'system.alert' };

    const result = toStorePayload(node);

    expect(result.event).toBe('system.alert');
    expect(result.payload).toEqual({ event: 'system.alert' });
  });

  test('handles an empty `event` string', () => {
    const node = { event: '' };

    const result = toStorePayload(node);

    expect(result.event).toBe('');
    expect(result.payload).toEqual({ event: '' });
  });

  test('does not mutate or clone the input node', () => {
    const node = { event: 'task.completed', taskId: 't-1' };

    const result = toStorePayload(node);

    expect(result.payload).toBe(node);
    expect(node).toEqual({ event: 'task.completed', taskId: 't-1' });
  });
});
