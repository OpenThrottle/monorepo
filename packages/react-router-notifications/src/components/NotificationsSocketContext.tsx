import * as React from 'react';
import type { Socket } from 'socket.io-client';
import { NotificationSocketStatus } from '../types';

export interface NotificationsSocketContextValue {
  readonly socket: Socket | null;
  readonly status: NotificationSocketStatus;
}

/**
 * @description React context for the notifications WebSocket (Socket.IO) connection.
 * Connects to the configured URL, subscribes to notification events, and exposes
 * connection status for UI (connect/disconnect/reconnect).
 */
export const NotificationsSocketContext = React.createContext<NotificationsSocketContextValue | null>(null); // prettier-ignore
