import * as React from 'react';
import type { TypedDocumentNode } from '@graphql-typed-document-node/core';
import type { GraphqlWsClient } from '@openthrottle/react-router-graphql';
import { useSubscription } from '@openthrottle/react-router-graphql';
import { IS_BROWSER } from '@openthrottle/react-router-utils';
import { useNavigate } from 'react-router';
import { toastForNotification } from '../data/notifications-store.context';
import { useNotificationsStore } from '../hooks/useNotificationsStore';
import { toStorePayload } from '../utils/to-store-payload';
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
  /**
   * Gate the subscription on auth. Defaults to `true`; pass `false` while the
   * user is signed out so the bridge never opens the socket (which would mint a
   * ws token against a missing session). Prevents the unauthenticated
   * `/auth/ws-token` request that would otherwise fire on the login page.
   */
  readonly enabled?: boolean;
}

/**
 * @description Realtime notifications bridge. Subscribes to the `notifications`
 * firehose over graphql-ws and feeds the notifications store / toast /
 * system-notification pipeline. Mount once inside {@link NotificationsStoreProvider};
 * apps supply their graphql-ws client and generated subscription document.
 *
 * @public
 */
export const NotificationsSubscriptionBridge = <
  TData extends NotificationsSubscriptionData,
>(
  props: NotificationsSubscriptionBridgeProps<TData>,
): React.ReactElement => {
  const { children, client, document, enabled = true } = props;

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

  useSubscription(client, document, {}, { onData }, enabled);

  // 🔌 Short Circuit

  return <>{children}</>;
};
