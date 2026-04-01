/**
 * @description Interceptor that reads {@link EmitNotification} metadata and, after the handler returns, calls the injectable emitter when the payload mapper returns non-null. Use with a provider bound to {@link EMIT_NOTIFICATION_EMITTER} (e.g. NotificationsService or an adapter that implements {@link EmitNotificationEmitter}).
 */

import {
  type CallHandler,
  type ExecutionContext,
  Inject,
  Injectable,
  type NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Observable } from 'rxjs';
import { tap } from 'rxjs';
import {
  type EmitNotificationMetadataValue,
  EMIT_NOTIFICATION_KEY,
} from './emit-notification.decorator';

/**
 * @description Minimal interface for the injectable emitter. The consuming app provides a provider that implements this (e.g. maps event names to emitPlanUpdated/emitTaskCompleted or implements a single emit(event, payload)).
 */
export interface EmitNotificationEmitter {
  emit(event: string, payload: unknown): void;
}

/** Injection token for the emitter used by {@link EmitNotificationInterceptor}. */
export const EMIT_NOTIFICATION_EMITTER = 'EMIT_NOTIFICATION_EMITTER';

/**
 * @description Interceptor that, after the handler completes, reads emit-notification metadata from the handler; if present and the payload mapper returns non-null, calls the injected emitter with the event name and payload.
 */
@Injectable()
export class EmitNotificationInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    @Inject(EMIT_NOTIFICATION_EMITTER)
    private readonly emitter: EmitNotificationEmitter,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const raw = this.reflector.get<EmitNotificationMetadataValue | undefined>(
      EMIT_NOTIFICATION_KEY,
      context.getHandler(),
    );
    if (raw == null) {
      return next.handle();
    }
    const entries = Array.isArray(raw) ? raw : [raw];
    return next.handle().pipe(
      tap((result: unknown): void => {
        for (const { event, payload: payloadMapper } of entries) {
          const payload =
            payloadMapper != null ? payloadMapper(result) : (result as unknown);
          if (payload != null) {
            this.emitter.emit(event, payload);
          }
        }
      }),
    );
  }
}
