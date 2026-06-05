import * as React from 'react';
import { useNotificationsSocket } from '@openthrottle/react-router-notifications';
import {
  OpenThrottleFieldset,
  OpenThrottleWebsocketDebugger,
} from '@openthrottle/react-router-ui';
import { RadioIcon } from 'lucide-react';

/** @description Fragment id for deep links to the live Socket.IO feed on Settings → Debug. */
export const SETTINGS_WEBSOCKET_DEBUGGER_FRAGMENT_ID = 'socket-io-event-feed';

/**
 * @description Settings → Debug panel wrapper: connects {@link OpenThrottleWebsocketDebugger}
 * to the root {@link NotificationsSocketProvider} fan-out (no duplicate socket listeners).
 */
export const SettingsWebsocketDebugger = (): React.ReactElement => {
  // Hooks
  const socketContext = useNotificationsSocket();

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <OpenThrottleFieldset
      icon={RadioIcon}
      id={SETTINGS_WEBSOCKET_DEBUGGER_FRAGMENT_ID}
      legend="Socket.IO event feed"
    >
      <OpenThrottleWebsocketDebugger
        connectionStatus={socketContext?.status ?? 'disconnected'}
        subscribeToEvents={socketContext?.subscribeToNotifications}
      />
    </OpenThrottleFieldset>
  );
};
