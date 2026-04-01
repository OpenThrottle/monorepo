import { firstValueFrom, of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { Reflector } from '@nestjs/core';
import type { CallHandler, ExecutionContext } from '@nestjs/common';
import {
  EmitNotificationInterceptor,
  type EmitNotificationEmitter,
} from './emit-notification.interceptor';
import type { EmitNotificationMetadata } from './emit-notification.decorator';

function createMockContext(handler: () => void): ExecutionContext {
  return {
    getArgByIndex: () => ({}),
    getArgs: () => [],
    getClass: () => ({}) as unknown as Constructor,
    getHandler: () => handler,
    getType: () => 'http',
    switchToHttp: () =>
      ({}) as unknown as import('@nestjs/common').HttpArgumentsHost,
    switchToRpc: () =>
      ({}) as unknown as import('@nestjs/common').RpcArgumentsHost,
    switchToWs: () =>
      ({}) as unknown as import('@nestjs/common').WsArgumentsHost,
  } as ExecutionContext;
}

type Constructor = new (...args: unknown[]) => unknown;

describe('EmitNotificationInterceptor', () => {
  it('returns next.handle() when no metadata is present', () => {
    const reflector = {
      get: vi.fn().mockReturnValue(undefined),
    } as unknown as Reflector;
    const emitter = { emit: vi.fn() } as unknown as EmitNotificationEmitter;
    const interceptor = new EmitNotificationInterceptor(reflector, emitter);
    const next = {
      handle: vi.fn().mockReturnValue(of({ result: 1 })),
    } as unknown as CallHandler;
    const context = createMockContext(() => undefined);

    const out = interceptor.intercept(context, next);

    expect(next.handle).toHaveBeenCalledTimes(1);
    out.subscribe((value) => expect(value).toEqual({ result: 1 }));
    expect(emitter.emit).not.toHaveBeenCalled();
  });

  it('emits with result as payload when metadata has no payload mapper and result is non-null', async () => {
    const metadata: EmitNotificationMetadata = { event: 'plan.updated' };
    const reflector = {
      get: vi.fn().mockReturnValue(metadata),
    } as unknown as Reflector;
    const emitter = { emit: vi.fn() } as unknown as EmitNotificationEmitter;
    const interceptor = new EmitNotificationInterceptor(reflector, emitter);
    const result = { plan: { id: 'p1' } };
    const next = {
      handle: vi.fn().mockReturnValue(of(result)),
    } as unknown as CallHandler;
    const context = createMockContext(() => undefined);

    const value = await firstValueFrom(interceptor.intercept(context, next));
    expect(value).toEqual(result);
    expect(emitter.emit).toHaveBeenCalledTimes(1);
    expect(emitter.emit).toHaveBeenCalledWith('plan.updated', result);
  });

  it('emits with payload mapper result when metadata has payload mapper returning non-null', async () => {
    const payloadMapper = (ret: unknown): unknown =>
      ret != null && typeof ret === 'object' && 'plan' in ret
        ? (ret as { plan: unknown }).plan
        : null;
    const metadata: EmitNotificationMetadata = {
      event: 'plan.updated',
      payload: payloadMapper,
    };
    const reflector = {
      get: vi.fn().mockReturnValue(metadata),
    } as unknown as Reflector;
    const emitter = { emit: vi.fn() } as unknown as EmitNotificationEmitter;
    const interceptor = new EmitNotificationInterceptor(reflector, emitter);
    const result = { plan: { id: 'p1' } };
    const next = {
      handle: vi.fn().mockReturnValue(of(result)),
    } as unknown as CallHandler;
    const context = createMockContext(() => undefined);

    const value = await firstValueFrom(interceptor.intercept(context, next));
    expect(value).toEqual(result);
    expect(emitter.emit).toHaveBeenCalledTimes(1);
    expect(emitter.emit).toHaveBeenCalledWith('plan.updated', { id: 'p1' });
  });

  it('does not emit when payload mapper returns null', async () => {
    const payloadMapper = (): null => null;
    const metadata: EmitNotificationMetadata = {
      event: 'plan.updated',
      payload: payloadMapper,
    };
    const reflector = {
      get: vi.fn().mockReturnValue(metadata),
    } as unknown as Reflector;
    const emitter = { emit: vi.fn() } as unknown as EmitNotificationEmitter;
    const interceptor = new EmitNotificationInterceptor(reflector, emitter);
    const next = {
      handle: vi.fn().mockReturnValue(of(undefined)),
    } as unknown as CallHandler;
    const context = createMockContext(() => undefined);

    const value = await firstValueFrom(interceptor.intercept(context, next));
    expect(value).toBeUndefined();
    expect(emitter.emit).not.toHaveBeenCalled();
  });

  it('does not emit when no payload mapper and result is null', async () => {
    const metadata: EmitNotificationMetadata = { event: 'plan.updated' };
    const reflector = {
      get: vi.fn().mockReturnValue(metadata),
    } as unknown as Reflector;
    const emitter = { emit: vi.fn() } as unknown as EmitNotificationEmitter;
    const interceptor = new EmitNotificationInterceptor(reflector, emitter);
    const next = {
      handle: vi.fn().mockReturnValue(of(null)),
    } as unknown as CallHandler;
    const context = createMockContext(() => undefined);

    const value = await firstValueFrom(interceptor.intercept(context, next));
    expect(value).toBeNull();
    expect(emitter.emit).not.toHaveBeenCalled();
  });

  it('passes through the same observable value', async () => {
    const metadata: EmitNotificationMetadata = { event: 'task.completed' };
    const reflector = {
      get: vi.fn().mockReturnValue(metadata),
    } as unknown as Reflector;
    const emitter = { emit: vi.fn() } as unknown as EmitNotificationEmitter;
    const interceptor = new EmitNotificationInterceptor(reflector, emitter);
    const result = { planId: 'p1', taskId: 't1' };
    const next = {
      handle: vi.fn().mockReturnValue(of(result)),
    } as unknown as CallHandler;
    const context = createMockContext(() => undefined);

    const value = await firstValueFrom(interceptor.intercept(context, next));
    expect(value).toBe(result);
  });

  it('emits multiple events when metadata is array', async () => {
    const plan = { id: 'p1', status: 'COMPLETED', title: 'Plan' };
    const metadata: EmitNotificationMetadata[] = [
      {
        event: 'plan.updated',
        payload: (ret: unknown) =>
          ret != null
            ? { message: 'Updated', planId: (ret as { id: string }).id }
            : null,
      },
      {
        event: 'plan.status_changed',
        payload: (ret: unknown) =>
          ret != null &&
          typeof ret === 'object' &&
          'id' in ret &&
          'status' in ret
            ? {
                planId: (ret as { id: string }).id,
                status: (ret as { status: string }).status,
              }
            : null,
      },
    ];
    const reflector = {
      get: vi.fn().mockReturnValue(metadata),
    } as unknown as Reflector;
    const emitter = { emit: vi.fn() } as unknown as EmitNotificationEmitter;
    const interceptor = new EmitNotificationInterceptor(reflector, emitter);
    const next = {
      handle: vi.fn().mockReturnValue(of(plan)),
    } as unknown as CallHandler;
    const context = createMockContext(() => undefined);

    await firstValueFrom(interceptor.intercept(context, next));
    expect(emitter.emit).toHaveBeenCalledTimes(2);
    expect(emitter.emit).toHaveBeenNthCalledWith(1, 'plan.updated', {
      message: 'Updated',
      planId: 'p1',
    });
    expect(emitter.emit).toHaveBeenNthCalledWith(2, 'plan.status_changed', {
      planId: 'p1',
      status: 'COMPLETED',
    });
  });
});
