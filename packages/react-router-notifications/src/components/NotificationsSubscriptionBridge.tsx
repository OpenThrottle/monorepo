import * as React from 'react';
import type { TypedDocumentNode } from '@graphql-typed-document-node/core';
import type {
  NotificationEventName,
  NotificationPayload,
} from '@openthrottle/openthrottle-notifications';
import type { GraphqlWsClient } from '@openthrottle/react-router-graphql';
import { useSubscription } from '@openthrottle/react-router-graphql';
import { IS_BROWSER } from '@openthrottle/react-router-utils';
import { useNavigate } from 'react-router';
import { toastForNotification } from '../data/notifications-store.context';
import { useNotificationsStore } from '../hooks/useNotificationsStore';
import {
  getSystemNotificationsPreference,
  showSystemNotification,
} from '../utils/system-notification';

/**
 * @description Minimum shape the injected subscription document's payload must
 * carry: the `notifications` node with its `event` discriminator. Generated
 * subscription types satisfy this structurally.
 *
 * @public
 */
export interface NotificationsSubscriptionData {
  readonly notifications: {
    readonly event: string;
  };
}

export interface NotificationsSubscriptionBridgeProps<
  TData extends NotificationsSubscriptionData,
> {
  readonly children: React.ReactNode;
  /** graphql-ws client; pass `null` during SSR to no-op. */
  readonly client: GraphqlWsClient | null;
  /**
   * Generated `notifications` subscription document. Injected so codegen
   * artifacts stay app-side and this package needs no codegen target.
   */
  readonly document: TypedDocumentNode<TData, Record<string, never>>;
}

/**
 * @description Re-types the transport payload to the store's domain types at
 * this single boundary. The GraphQL `notifications` node is structurally the
 * store's payload (message, severity, link, planId, …) with `event` as the
 * discriminator, but the generated document types are looser (GraphQL
 * nullability) than the strict {@link NotificationPayload} union, so this is the
 * one place the boundary is bridged. Types only — no runtime coercion (the
 * returned `payload` is the same `node` object).
 */
function toStorePayload(node: NotificationsSubscriptionData['notifications']): {
  event: NotificationEventName;
  payload: NotificationPayload;
};
function toStorePayload(
  node: NotificationsSubscriptionData['notifications'],
): unknown {
  return { event: node.event, payload: node };
}

/**
 * @description Realtime notifications bridge. Subscribes to the `notifications`
 * firehose over graphql-ws and feeds the notifications store / toast /
 * system-notification pipeline. Mount once inside {@link NotificationsStoreProvider};
 * apps supply their graphql-ws client and generated subscription document.
 *
 * @public
 */
export function NotificationsSubscriptionBridge<
  TData extends NotificationsSubscriptionData,
>(props: NotificationsSubscriptionBridgeProps<TData>): React.ReactElement {
  const { children, client, document } = props;

  // Hooks
  const { addNotification } = useNotificationsStore();
  const navigate = useNavigate();

  // Setup

  // Handlers
  const onData = React.useCallback(
    (data: TData) => {
      const { event, payload } = toStorePayload(data.notifications);

      addNotification(event, payload);
      toastForNotification(payload, navigate);
      showSystemNotification(event, payload, navigate);
    },
    [addNotification, navigate],
  );

  // Markup

  // Life Cycle
  React.useLayoutEffect(() => {
    if (!IS_BROWSER) return;

    getSystemNotificationsPreference();

    // 🪝 Parse system-notification prefs once before the first event (mirrors the retired socket bridge).
  }, []);

  useSubscription(client, document, {}, { onData });

  // 🔌 Short Circuit

  return <>{children}</>;
}
