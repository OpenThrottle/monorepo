import { describe, expect, expectTypeOf, it } from 'vitest';

import { NOTIFICATION_EVENT_NAMES } from '../events.ts';
import type { NotificationEventMap, NotificationEventName } from '../events.ts';
import { NOTIFICATION_SEVERITIES } from '../types.ts';
import type { NotificationSeverity } from '../types.ts';

describe('events', () => {
  describe('NOTIFICATION_EVENT_NAMES', () => {
    // Pin the exact wire-contract strings. A typo here is a breaking change for
    // every server emitter and developer-app subscriber, so it must fail the build.
    it('pins the exact event-name string values', () => {
      expect(NOTIFICATION_EVENT_NAMES).toEqual({
        DEBUG: 'debug',
        PLAN_ENQUEUED: 'plan.enqueued',
        PLAN_STATUS_CHANGED: 'plan.status_changed',
        PLAN_UPDATED: 'plan.updated',
        PLAN_WAITING_FOR_WORKTREE: 'plan.waiting_for_worktree',
        QUEUE_JOB_COMPLETED: 'queue.job.completed',
        SYSTEM_ALERT: 'system.alert',
        TASK_COMPLETED: 'task.completed',
        TASK_STATUS_CHANGED: 'task.status_changed',
      });
    });

    it('has unique event-name string values', () => {
      const values = Object.values(NOTIFICATION_EVENT_NAMES);

      expect(new Set(values).size).toBe(values.length);
    });
  });

  describe('NOTIFICATION_SEVERITIES', () => {
    it('pins the exact severity membership', () => {
      expect(NOTIFICATION_SEVERITIES).toEqual([
        'error',
        'info',
        'success',
        'warning',
      ]);
    });

    it('has unique severity values', () => {
      expect(new Set(NOTIFICATION_SEVERITIES).size).toBe(
        NOTIFICATION_SEVERITIES.length,
      );
    });
  });

  describe('NotificationEventMap', () => {
    // The map is the type-safe emit/on contract; its keys must stay in lockstep
    // with the event-name values. These are type-level assertions — they fail at
    // typecheck (typecheck-tests) if a new event name is added without a map entry
    // (or vice versa), catching the drift the audit flagged.
    it('has a payload entry for every event name (and no extras)', () => {
      expectTypeOf<
        keyof NotificationEventMap
      >().toEqualTypeOf<NotificationEventName>();
    });

    it('keys are exactly the NOTIFICATION_EVENT_NAMES values', () => {
      expectTypeOf<keyof NotificationEventMap>().toEqualTypeOf<
        (typeof NOTIFICATION_EVENT_NAMES)[keyof typeof NOTIFICATION_EVENT_NAMES]
      >();
    });
  });

  describe('NotificationSeverity', () => {
    it('is the union of NOTIFICATION_SEVERITIES values', () => {
      expectTypeOf<NotificationSeverity>().toEqualTypeOf<
        (typeof NOTIFICATION_SEVERITIES)[number]
      >();
    });
  });
});
