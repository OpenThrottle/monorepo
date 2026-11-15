import { describe, expect, test } from 'vitest';

import {
  getNotificationTaskId,
  shouldRevalidateForLifecycleEvent,
} from '../plan-lifecycle-events';

describe('getNotificationTaskId', () => {
  test('reads a string taskId', () => {
    expect(
      getNotificationTaskId({ event: 'task.status_changed', taskId: 't-1' }),
    ).toBe('t-1');
  });

  test('returns null for a plan-level event or a null taskId', () => {
    expect(getNotificationTaskId({ event: 'plan.status_changed' })).toBeNull();
    expect(
      getNotificationTaskId({ event: 'plan.updated', taskId: null }),
    ).toBeNull();
  });
});

describe('shouldRevalidateForLifecycleEvent', () => {
  const events = ['plan.status_changed', 'task.status_changed'];

  describe('when the event is not one the route listens for', () => {
    test('does not revalidate', () => {
      expect(
        shouldRevalidateForLifecycleEvent(
          { event: 'queue.job.completed' },
          { events, taskId: undefined },
        ),
      ).toBe(false);
    });
  });

  describe('when the route is plan-scoped', () => {
    test('revalidates on any listened event, whatever task it names', () => {
      expect(
        shouldRevalidateForLifecycleEvent(
          { event: 'task.status_changed', taskId: 'other' },
          { events, taskId: undefined },
        ),
      ).toBe(true);
    });
  });

  describe('when the route is task-scoped', () => {
    test('revalidates on an event for that task', () => {
      expect(
        shouldRevalidateForLifecycleEvent(
          { event: 'task.status_changed', taskId: 't-1' },
          { events, taskId: 't-1' },
        ),
      ).toBe(true);
    });

    test('ignores an event for a sibling task', () => {
      expect(
        shouldRevalidateForLifecycleEvent(
          { event: 'task.status_changed', taskId: 't-2' },
          { events, taskId: 't-1' },
        ),
      ).toBe(false);
    });

    test('still revalidates on a plan-level event', () => {
      expect(
        shouldRevalidateForLifecycleEvent(
          { event: 'plan.status_changed' },
          { events, taskId: 't-1' },
        ),
      ).toBe(true);
    });
  });
});
