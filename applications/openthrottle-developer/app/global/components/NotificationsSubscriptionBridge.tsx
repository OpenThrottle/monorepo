/**
 * @description App-side wiring for the shared realtime notifications bridge:
 * supplies this app's graphql-ws client and generated `notifications`
 * subscription document (codegen artifacts stay app-side). The pipeline itself
 * (store / toast / system-notification) lives in
 * `@openthrottle/react-router-notifications`.
 */

import * as React from 'react';
import { useAtomValue } from 'jotai';
import { NotificationsSubscriptionBridge as NotificationsSubscriptionBridgeBase } from '@openthrottle/react-router-notifications';
import { NotificationsDocument } from '~/__generated__/graphql';
import { userAtom } from '~/global/data/atom.user';
import { getGraphqlWsClient } from '~/services/graphql-ws-client';

export interface NotificationsSubscriptionBridgeProps {
  readonly children: React.ReactNode;
}

export const NotificationsSubscriptionBridge = (
  props: NotificationsSubscriptionBridgeProps,
): React.ReactElement => {
  const { children } = props;

  // Hooks
  const client = React.useMemo(() => getGraphqlWsClient(), []);
  const user = useAtomValue(userAtom);

  // Setup
  const isWebsocketEnabled = user !== null;

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <NotificationsSubscriptionBridgeBase
      client={client}
      document={NotificationsDocument}
      enabled={isWebsocketEnabled}
    >
      {children}
    </NotificationsSubscriptionBridgeBase>
  );
};
