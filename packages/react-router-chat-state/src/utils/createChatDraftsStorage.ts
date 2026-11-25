import { createJSONStorage } from 'jotai/utils';

import type { ChatDraftsState } from '../data/chat-drafts-state';
import { normalizeChatDraftsState } from './normalizeChatDraftsState';

/**
 * SSR-guarded JSON storage that normalizes on read: a no-op store on the
 * server, localStorage in the browser. No cross-tab `subscribe`, matching the
 * toolbar atom.
 */
export const createChatDraftsStorage = (): ReturnType<
  typeof createJSONStorage<ChatDraftsState>
> => {
  const jsonStorage = createJSONStorage<ChatDraftsState>(() => {
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
      return normalizeChatDraftsState(raw);
    },
  };
};
