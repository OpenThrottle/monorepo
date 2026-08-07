/**
 * @description Metadata and decorator for declaring socket notification emissions on resolver/handler methods.
 * Use with {@link EmitNotificationInterceptor} so the interceptor reads this metadata and calls the emitter after the method returns,
 * skipping emission when the resolved payload is nullish (null/undefined).
 */

import { SetMetadata } from '@nestjs/common';

/** Metadata key for emit-notification options on a method. */
export const EMIT_NOTIFICATION_KEY = 'emitNotification';

/**
 * @description Shape of metadata set by {@link EmitNotification}. The interceptor reads this and, when present and the resolved payload is non-nullish (null/undefined skipped), emits via the injected emitter.
 */
export interface EmitNotificationMetadata {
  readonly event: string;
  /** Optional mapper from method return value to payload; if it returns a nullish value (null/undefined), no emission. */
  readonly payload?: (ret: unknown) => unknown | null;
}

/** Metadata may be a single entry or array for multiple emissions from one method. */
export type EmitNotificationMetadataValue =
  EmitNotificationMetadata | readonly EmitNotificationMetadata[];

function isMetadataEntryArray(
  value:
    | string
    | EmitNotificationMetadata
    | readonly (string | EmitNotificationMetadata)[],
): value is readonly (string | EmitNotificationMetadata)[] {
  return Array.isArray(value);
}

function normalizeOne(
  eventOrOptions: string | EmitNotificationMetadata,
  payload?: (ret: unknown) => unknown | null,
): EmitNotificationMetadata {
  if (typeof eventOrOptions === 'string') {
    return { event: eventOrOptions, payload };
  }

  return {
    event: eventOrOptions.event,
    payload: eventOrOptions.payload,
  };
}

/**
 * @description Declares that when this method is invoked and returns, a
 * notification event should be emitted with the given event name and
 * optional payload derived from the return value. No DI in the decorator;
 * the actual emission is performed by {@link EmitNotificationInterceptor}
 * using an injectable emitter (e.g. NotificationsService).
 *
 * @example Event only (interceptor may still emit with a fixed or no payload)
 * ```ts
 * @EmitNotification('plan.updated')
 * async updatePlan(...) { ... }
 * ```
 *
 * @example Event and payload mapper (emit only when the resolved payload is non-nullish)
 * ```ts
 * @EmitNotification('plan.updated', (ret) => ret?.plan ?? null)
 * async updatePlan(...) { return { plan }; }
 * ```
 *
 * @example Object form
 * ```ts
 * @EmitNotification({ event: 'plan.updated', payload: (ret) => ret ?? null })
 * async updatePlan(...) { ... }
 * ```
 *
 * @example Multiple events from one method (array form)
 * ```ts
 * @EmitNotification([
 *   { event: 'plan.updated', payload: (ret) => ret ?? null },
 *   { event: 'plan.status_changed', payload: (ret) => ret != null ? { planId: ret.id, status: ret.status } : null },
 * ])
 * async setPlanStatus(...) { ... }
 * ```
 */
export function EmitNotification(
  eventOrOptions:
    | string
    | EmitNotificationMetadata
    | readonly (string | EmitNotificationMetadata)[],
  payload?: (ret: unknown) => unknown | null,
): MethodDecorator {
  const singleOrArray:
    | string
    | EmitNotificationMetadata
    | readonly (string | EmitNotificationMetadata)[] = eventOrOptions;

  const metadata: EmitNotificationMetadataValue = isMetadataEntryArray(
    singleOrArray,
  )
    ? singleOrArray.map((e) => normalizeOne(e))
    : normalizeOne(singleOrArray, payload);

  return SetMetadata(EMIT_NOTIFICATION_KEY, metadata);
}
