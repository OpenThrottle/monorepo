import { useContext } from 'react';
import { NotificationsStoreContext } from '../data/index';

export interface UseNotificationsStoreOptions {}

/**
 * @description Returns the notifications store context. Throws when used outside a
 * {@link NotificationsStoreProvider}.
 *
 * @public
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
