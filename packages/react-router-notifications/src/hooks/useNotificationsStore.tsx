import { useContext } from 'react';
import { NotificationsStoreContext } from '../data/index';

export interface UseNotificationsStoreOptions {}

/**
 * @description TODO: Add a description or delete the comment, dealers choice.
 */
export const useNotificationsStore = (
  _options?: UseNotificationsStoreOptions,
) => {
  // const {} = _options;

  // Hooks
  const ctx = useContext(NotificationsStoreContext);

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit
  if (!ctx) {
    const message = `🚨 useNotificationsStore must be used within a NotificationsStoreProvider`;

    throw new Error(message);
  }

  return ctx;
};
