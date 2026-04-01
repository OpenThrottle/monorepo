import * as React from 'react';
import { useNavigate } from 'react-router';
import {
  NotificationEventName,
  NotificationPayload,
} from '@openthrottle/openthrottle-notifications';
import { NotificationsSocketProvider } from '../components/NotificationsSocketProvider';
import { toastForNotification } from '../data/index';
import { showSystemNotification } from '../utils/index';
import { useNotificationsStore } from '../hooks/useNotificationsStore';

export interface NotificationsSocketBridgeProps {
  readonly children: React.ReactNode;
  readonly webSocketUrl: string;
}

export const NotificationsSocketBridge = (
  props: NotificationsSocketBridgeProps,
) => {
  const { children, webSocketUrl } = props;

  // Hooks
  const { addNotification } = useNotificationsStore();
  const navigate = useNavigate();

  // Setup

  // Handlers
  const onNotification = React.useCallback(
    (event: NotificationEventName, payload: NotificationPayload) => {
      addNotification(event, payload);
      toastForNotification(payload, navigate);
      showSystemNotification(event, payload, navigate);
    },
    [addNotification, navigate],
  );

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <NotificationsSocketProvider
      data-testid="NotificationsSocketBridge"
      onNotification={onNotification}
      webSocketUrl={webSocketUrl}
    >
      {children}
    </NotificationsSocketProvider>
  );
};
