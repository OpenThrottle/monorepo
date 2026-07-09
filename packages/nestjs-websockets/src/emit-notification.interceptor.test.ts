import { firstValueFrom, of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { CallHandler, ExecutionContext } from '@nestjs/common';
import type {
  HttpArgumentsHost,
  RpcArgumentsHost,
  WsArgumentsHost,
} from '@nestjs/common/interfaces/features/arguments-host.interface.ts';
import { asMock } from '@openthrottle/nestjs-testing';
import {
  EmitNotificationInterceptor,
  type EmitNotificationEmitter,
} from './emit-notification.interceptor';
import type { EmitNotificationMetadata } from './emit-notification.decorator';

function createMockContext(handler: () => void): ExecutionContext {
  return asMock<ExecutionContext>({
    getArgByIndex: () => ({}),
    getArgs: () => [],
    getClass: () => asMock<Constructor>({}),
    getHandler: () => handler,
    getType: () => 'http',
    switchToHttp: () => asMock<HttpArgumentsHost>({}),
    switchToRpc: () => asMock<RpcArgumentsHost>({}),
    switchToWs: () => asMock<WsArgumentsHost>({}),
  });
}

type Constructor = new (...args: unknown[]) => unknown;

describe('EmitNotificationInterceptor', () => {
  it('returns next.handle() when no metadata is present', () => {
    const reflector = asMock<Reflector>({
      get: vi.fn().mockReturnValue(undefined),
    });
    const emitter = asMock<EmitNotificationEmitter>({ emit: vi.fn() });
    const interceptor = new EmitNotificationInterceptor(reflector, emitter);
    const next = asMock<CallHandler>({
      handle: vi.fn().mockReturnValue(of({ result: 1 })),
    });
    const context = createMockContext(() => undefined);

    const out = interceptor.intercept(context, next);

    expect(next.handle).toHaveBeenCalledTimes(1);
    out.subscribe((value) => expect(value).toEqual({ result: 1 }));
    expect(emitter.emit).not.toHaveBeenCalled();
  });

  it('emits with result as payload when metadata has no payload mapper and result is non-null', async () => {
    const metadata: EmitNotificationMetadata = { event: 'plan.updated' };
    const reflector = asMock<Reflector>({
      get: vi.fn().mockReturnValue(metadata),
    });
    const emitter = asMock<EmitNotificationEmitter>({ emit: vi.fn() });
    const interceptor = new EmitNotificationInterceptor(reflector, emitter);
    const result = { plan: { id: 'p1' } };
    const next = asMock<CallHandler>({
      handle: vi.fn().mockReturnValue(of(result)),
    });
    const context = createMockContext(() => undefined);

    const value = await firstValueFrom(interceptor.intercept(context, next));
    expect(value).toEqual(result);
    expect(emitter.emit).toHaveBeenCalledTimes(1);
    expect(emitter.emit).toHaveBeenCalledWith('plan.updated', result);
  });

  it('emits with payload mapper result when metadata has payload mapper returning non-null', async () => {
    const payloadMapper = (ret: unknown): unknown =>
      ret != null && typeof ret === 'object' && 'plan' in ret
        ? asMock<{ plan: unknown }>(ret).plan
        : null;
    const metadata: EmitNotificationMetadata = {
      event: 'plan.updated',
      payload: payloadMapper,
    };
    const reflector = asMock<Reflector>({
      get: vi.fn().mockReturnValue(metadata),
    });
    const emitter = asMock<EmitNotificationEmitter>({ emit: vi.fn() });
    const interceptor = new EmitNotificationInterceptor(reflector, emitter);
    const result = { plan: { id: 'p1' } };
    const next = asMock<CallHandler>({
      handle: vi.fn().mockReturnValue(of(result)),
    });
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
    const reflector = asMock<Reflector>({
      get: vi.fn().mockReturnValue(metadata),
    });
    const emitter = asMock<EmitNotificationEmitter>({ emit: vi.fn() });
    const interceptor = new EmitNotificationInterceptor(reflector, emitter);
    const next = asMock<CallHandler>({
      handle: vi.fn().mockReturnValue(of(undefined)),
    });
    const context = createMockContext(() => undefined);

    const value = await firstValueFrom(interceptor.intercept(context, next));
    expect(value).toBeUndefined();
    expect(emitter.emit).not.toHaveBeenCalled();
  });

  it('does not emit when no payload mapper and result is null', async () => {
    const metadata: EmitNotificationMetadata = { event: 'plan.updated' };
    const reflector = asMock<Reflector>({
      get: vi.fn().mockReturnValue(metadata),
    });
    const emitter = asMock<EmitNotificationEmitter>({ emit: vi.fn() });
    const interceptor = new EmitNotificationInterceptor(reflector, emitter);
    const next = asMock<CallHandler>({
      handle: vi.fn().mockReturnValue(of(null)),
    });
    const context = createMockContext(() => undefined);

    const value = await firstValueFrom(interceptor.intercept(context, next));
    expect(value).toBeNull();
    expect(emitter.emit).not.toHaveBeenCalled();
  });

  it('passes through the same observable value', async () => {
    const metadata: EmitNotificationMetadata = { event: 'task.completed' };
    const reflector = asMock<Reflector>({
      get: vi.fn().mockReturnValue(metadata),
    });
    const emitter = asMock<EmitNotificationEmitter>({ emit: vi.fn() });
    const interceptor = new EmitNotificationInterceptor(reflector, emitter);
    const result = { planId: 'p1', taskId: 't1' };
    const next = asMock<CallHandler>({
      handle: vi.fn().mockReturnValue(of(result)),
    });
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
            ? { message: 'Updated', planId: asMock<{ id: string }>(ret).id }
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
                planId: asMock<{ id: string }>(ret).id,
                status: asMock<{ status: string }>(ret).status,
              }
            : null,
      },
    ];
    const reflector = asMock<Reflector>({
      get: vi.fn().mockReturnValue(metadata),
    });
    const emitter = asMock<EmitNotificationEmitter>({ emit: vi.fn() });
    const interceptor = new EmitNotificationInterceptor(reflector, emitter);
    const next = asMock<CallHandler>({
      handle: vi.fn().mockReturnValue(of(plan)),
    });
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

  it('does not fail the response stream when the emitter throws synchronously, and logs the failure', async () => {
    const metadata: EmitNotificationMetadata = { event: 'plan.updated' };
    const reflector = asMock<Reflector>({
      get: vi.fn().mockReturnValue(metadata),
    });
    const emitter = asMock<EmitNotificationEmitter>({
      emit: vi.fn().mockImplementation(() => {
        throw new Error('boom');
      }),
    });
    const loggerError = vi
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);
    const interceptor = new EmitNotificationInterceptor(reflector, emitter);
    const result = { plan: { id: 'p1' } };
    const next = asMock<CallHandler>({
      handle: vi.fn().mockReturnValue(of(result)),
    });
    const context = createMockContext(() => undefined);

    const value = await firstValueFrom(interceptor.intercept(context, next));
    expect(value).toBe(result);
    expect(emitter.emit).toHaveBeenCalledTimes(1);
    expect(loggerError).toHaveBeenCalledTimes(1);
    expect(loggerError.mock.calls[0]?.[0]).toContain('plan.updated');

    loggerError.mockRestore();
  });

  it('continues emitting remaining entries after one entry throws', async () => {
    const metadata: EmitNotificationMetadata[] = [
      { event: 'plan.updated' },
      { event: 'plan.status_changed' },
    ];
    const reflector = asMock<Reflector>({
      get: vi.fn().mockReturnValue(metadata),
    });
    const emitter = asMock<EmitNotificationEmitter>({
      emit: vi.fn().mockImplementationOnce(() => {
        throw new Error('boom');
      }),
    });
    const loggerError = vi
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);
    const interceptor = new EmitNotificationInterceptor(reflector, emitter);
    const result = { id: 'p1' };
    const next = asMock<CallHandler>({
      handle: vi.fn().mockReturnValue(of(result)),
    });
    const context = createMockContext(() => undefined);

    const value = await firstValueFrom(interceptor.intercept(context, next));
    expect(value).toBe(result);
    expect(emitter.emit).toHaveBeenCalledTimes(2);
    expect(emitter.emit).toHaveBeenNthCalledWith(
      2,
      'plan.status_changed',
      result,
    );
    expect(loggerError).toHaveBeenCalledTimes(1);
    expect(loggerError.mock.calls[0]?.[0]).toContain('plan.updated');

    loggerError.mockRestore();
  });
});
