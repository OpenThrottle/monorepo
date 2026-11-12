import type {
  NotificationEventName,
  NotificationPayload,
} from '@openthrottle/openthrottle-notifications';

/**
 * @description Re-types the transport payload to the store's domain types at
 * this single boundary. The GraphQL `notifications` node is structurally the
 * store's payload (message, severity, link, planId, …) with `event` as the
 * discriminator, but the generated document types are looser (GraphQL
 * nullability) than the strict {@link NotificationPayload} union, so this is the
 * one place the boundary is bridged. Types only — no runtime coercion (the
 * returned `payload` is the same `node` object).
 */
export function toStorePayload(node: { readonly event: string }): {
  event: NotificationEventName;
  payload: NotificationPayload;
};
export function toStorePayload(node: { readonly event: string }): unknown {
  return { event: node.event, payload: node };
}
