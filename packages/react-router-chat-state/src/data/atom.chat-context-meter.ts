import { APP_NAME } from '@openthrottle/react-router-utils';
import { atomWithStorage, createJSONStorage } from 'jotai/utils';
import type { SyncStorage } from 'jotai/vanilla/utils/atomWithStorage';

/**
 * localStorage key for the composer's context-window meter opt-in, namespaced
 * per consuming app at runtime through `APP_NAME` (same scheme as the toolbar
 * atom).
 * @public
 */
export const CHAT_CONTEXT_METER_STORAGE_KEY = `${APP_NAME}:chat:context-meter`;

/**
 * SSR-guarded JSON storage that coerces anything but a stored `true` to
 * `false`, so a corrupt value can never turn the meter on.
 */
const createChatContextMeterStorage = (): SyncStorage<boolean> => {
  const jsonStorage = createJSONStorage<boolean>(() => {
    if (typeof window === 'undefined') {
      return {
        getItem: () => null,
        removeItem: () => {},
        setItem: () => {},
        subscribe: () => () => {},
      };
    }
    return localStorage;
  });

  return {
    ...jsonStorage,
    getItem: (key, initialValue) =>
      jsonStorage.getItem(key, initialValue) === true,
  };
};

/**
 * Whether the composer shows its context-window meter beside the token
 * counter. Off by default: the meter is opt-in.
 * @public
 */
export const chatContextMeterAtom = atomWithStorage(
  CHAT_CONTEXT_METER_STORAGE_KEY,
  false,
  createChatContextMeterStorage(),
  { getOnInit: true },
);
