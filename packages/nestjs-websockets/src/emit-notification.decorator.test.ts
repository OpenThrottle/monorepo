import 'reflect-metadata';
import { Reflector } from '@nestjs/core';
import { asMock } from '@openthrottle/nestjs-testing';
import { describe, expect, it } from 'vitest';
import {
  EMIT_NOTIFICATION_KEY,
  type EmitNotificationMetadata,
  type EmitNotificationMetadataValue,
  EmitNotification,
} from './emit-notification.decorator';

const reflector = new Reflector();

function getEmitNotificationMetadata(
  handler: (...args: unknown[]) => unknown,
): EmitNotificationMetadataValue | undefined {
  return reflector.get<EmitNotificationMetadataValue | undefined>(
    EMIT_NOTIFICATION_KEY,
    handler,
  );
}

describe('EmitNotification', () => {
  it('returns a MethodDecorator', () => {
    const dec = EmitNotification('plan.updated');
    expect(typeof dec).toBe('function');
  });

  it('sets metadata with event only when given a string', () => {
    class Test {
      @EmitNotification('plan.updated')
      updatePlan(): void {}
    }
    const meta = asMock<EmitNotificationMetadata | undefined>(
      getEmitNotificationMetadata(Test.prototype.updatePlan),
    );
    expect(meta).toBeDefined();
    expect(meta?.event).toBe('plan.updated');
    expect(meta?.payload).toBeUndefined();
  });

  it('sets metadata with event and payload mapper when given string and mapper', () => {
    const payloadFn = (ret: unknown): unknown => ret;
    class Test {
      @EmitNotification('task.completed', payloadFn)
      completeTask(): unknown {
        return null;
      }
    }
    const meta = asMock<EmitNotificationMetadata | undefined>(
      getEmitNotificationMetadata(Test.prototype.completeTask),
    );
    expect(meta).toBeDefined();
    expect(meta?.event).toBe('task.completed');
    expect(meta?.payload).toBe(payloadFn);
  });

  it('sets metadata when given object form', () => {
    const payloadFn = (ret: unknown): unknown => ret ?? null;
    class Test {
      @EmitNotification({
        event: 'plan.status_changed',
        payload: payloadFn,
      })
      setStatus(): void {}
    }
    const meta = asMock<EmitNotificationMetadata | undefined>(
      getEmitNotificationMetadata(Test.prototype.setStatus),
    );
    expect(meta).toBeDefined();
    expect(meta?.event).toBe('plan.status_changed');
    expect(meta?.payload).toBe(payloadFn);
  });

  it('sets metadata as array when given array form', () => {
    const payload1 = (ret: unknown): unknown => ret ?? null;
    const payload2 = (ret: unknown): unknown =>
      ret != null && typeof ret === 'object' && 'id' in ret
        ? { planId: ret.id, status: 'COMPLETED' }
        : null;
    class Test {
      @EmitNotification([
        { event: 'plan.updated', payload: payload1 },
        { event: 'plan.status_changed', payload: payload2 },
      ])
      setPlanStatus(): void {}
    }
    const meta = asMock<EmitNotificationMetadata[]>(
      getEmitNotificationMetadata(Test.prototype.setPlanStatus),
    );
    expect(Array.isArray(meta)).toBe(true);
    expect(meta).toHaveLength(2);
    expect(meta[0]?.event).toBe('plan.updated');
    expect(meta[0]?.payload).toBe(payload1);
    expect(meta[1]?.event).toBe('plan.status_changed');
    expect(meta[1]?.payload).toBe(payload2);
  });
});
