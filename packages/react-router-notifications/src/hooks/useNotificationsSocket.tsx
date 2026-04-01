import * as React from 'react';
import {
  NotificationsSocketContext,
  NotificationsSocketContextValue,
} from '../components/NotificationsSocketContext';

/**
 * @description Socket and status when inside {@link NotificationsSocketProvider};
 * `null` when used outside the provider (optional consumption, like the store’s
 * optional hook).
 */
export function useNotificationsSocket(): NotificationsSocketContextValue | null {
  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return React.useContext(NotificationsSocketContext);
}
