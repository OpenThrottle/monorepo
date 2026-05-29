import { describe, expect, test, vi } from 'vitest';
import { createNotificationSocketSubscriberRegistry } from '../notification-socket-subscribers';

describe('createNotificationSocketSubscriberRegistry', () => {
  test('notifies all subscribers', () => {
    const registry = createNotificationSocketSubscriberRegistry();
    const first = vi.fn();
    const second = vi.fn();

    registry.subscribe(first);
    registry.subscribe(second);

    registry.notify('plan.status_changed', { planId: 'abc' });

    expect(first).toHaveBeenCalledWith('plan.status_changed', {
      planId: 'abc',
    });
    expect(second).toHaveBeenCalledWith('plan.status_changed', {
      planId: 'abc',
    });
  });

  test('unsubscribe stops notifications', () => {
    const registry = createNotificationSocketSubscriberRegistry();
    const listener = vi.fn();

    const unsubscribe = registry.subscribe(listener);
    unsubscribe();

    registry.notify('task.updated', { taskId: 't1' });

    expect(listener).not.toHaveBeenCalled();
  });
});
