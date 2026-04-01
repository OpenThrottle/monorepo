import { useContext } from 'react';
import {
  NotificationsStoreContext,
  NotificationsStoreContextValue,
} from '../data/notifications-store.context';

export interface UseNotificationsStoreOptionalOptions {}

/**
 * @description TODO: Add a description or delete the comment, dealers choice.
 */
export const useNotificationsStoreOptional = (
  _options?: UseNotificationsStoreOptionalOptions,
): NotificationsStoreContextValue | null => {
  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return useContext(NotificationsStoreContext);
};
