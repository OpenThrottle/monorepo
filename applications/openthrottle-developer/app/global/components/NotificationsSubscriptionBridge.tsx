/**
 * @description Realtime notifications bridge. Subscribes to the `notifications`
 * firehose over graphql-ws and feeds the notifications store / toast /
 * system-notification pipeline — the single subscription transport for the app.
 */

import * as React from 'react';
import {
  getSystemNotificationsPreference,
  showSystemNotification,
  toastForNotification,
  useNotificationsStore,
} from '@openthrottle/react-router-notifications';
import type {
  NotificationEventName,
  NotificationPayload,
} from '@openthrottle/openthrottle-notifications';
import { IS_BROWSER } from '@openthrottle/react-router-utils';
import { useSubscription } from '@openthrottle/react-router-graphql';
import { useNavigate } from 'react-router';
import { NotificationsDocument } from '~/__generated__/graphql';
import { getGraphqlWsClient } from '~/services/graphql-ws-client';

export interface NotificationsSubscriptionBridgeProps {
  readonly children: React.ReactNode;
}

export const NotificationsSubscriptionBridge = (
  props: NotificationsSubscriptionBridgeProps,
): React.ReactElement => {
  const { children } = props;

  // Hooks
  const { addNotification } = useNotificationsStore();
  const navigate = useNavigate();
  const client = React.useMemo(() => getGraphqlWsClient(), []);

  // Setup

  // Handlers
  const onData = React.useCallback(
    (data: { notifications: { event: string } }) => {
      const node = data.notifications;

      // The GraphQL NotificationEvent is structurally the store's payload (message,
      // severity, link, planId, …); `event` is the discriminator. Cast at this
      // transition boundary until the store is typed against the schema types.
      const event = node.event as NotificationEventName;
      const payload = node as unknown as NotificationPayload;

      addNotification(event, payload);
      toastForNotification(payload, navigate);
      showSystemNotification(event, payload, navigate);
    },
    [addNotification, navigate],
  );

  // Handlers

  // Markup

  // Life Cycle
  React.useLayoutEffect(() => {
    if (!IS_BROWSER) return;

    getSystemNotificationsPreference();

    // 🪝 Parse system-notification prefs once before the first event (same as the retired socket bridge).
  }, []);

  useSubscription(client, NotificationsDocument, {}, { onData });

  // 🔌 Short Circuit

  return <>{children}</>;
};
