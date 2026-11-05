import { createJSONStorage } from 'jotai/utils';
import type { SyncStorage } from 'jotai/vanilla/utils/atomWithStorage';

import type { ChatToolbarState } from '../data/data.chat-toolbar-state';
import { normalizeChatToolbarState } from './normalize-chat-toolbar-state';

/**
 * SSR-guarded JSON storage that normalizes on read. On the server (no `window`)
 * it is a no-op store, so the atom hydrates to the default and the browser
 * re-reads localStorage on mount. No cross-tab `subscribe` — live cross-tab
 * toolbar sync is deferred.
 */
export const createChatToolbarStorage = (): SyncStorage<ChatToolbarState> => {
  const jsonStorage = createJSONStorage<ChatToolbarState>(() => {
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
      const raw = jsonStorage.getItem(key, initialValue);
      return normalizeChatToolbarState(raw);
    },
  };
};
