import { createJSONStorage } from 'jotai/utils';

/**
 * SSR-guarded JSON storage that coerces anything but a stored `true` to
 * `false`, so a corrupt value can never turn the meter on. A no-op store on
 * the server, localStorage in the browser.
 */
export const createChatContextMeterStorage = (): ReturnType<
  typeof createJSONStorage<boolean>
> => {
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
    getItem: (key, initialValue) => {
      return jsonStorage.getItem(key, initialValue) === true;
    },
  };
};
