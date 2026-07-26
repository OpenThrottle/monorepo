import * as React from 'react';
import type { ChatMentionProvider } from '@openthrottle/react-router-chat';
import type { IdeFilesResponse } from '~/routes/ide.files';

/** Cap on suggestions surfaced in the composer's `@`-mention popover. */
export const MAX_MENTION_SUGGESTIONS = 50;

/**
 * Build the composer's `@`-mention {@link ChatMentionProvider} for the selected
 * repository/checkout. Returns `undefined` when no repository is selected, so
 * the composer keeps the `@`-trigger disabled.
 *
 * The full file listing for a repository is fetched once from the `/ide/files`
 * resource route and cached for the session; subsequent keystrokes fuzzy-filter
 * the cached list client-side, so there is no per-keystroke network round-trip.
 * Concurrent first-fetches for the same repository are de-duplicated.
 */
export const useFileMentionProvider = (
  repositoryId: string | undefined,
): ChatMentionProvider | undefined => {
  // Kept in refs so the cache survives re-renders and popover open/close cycles.
  const listingCache = React.useRef(new Map<string, readonly string[]>());
  const inflight = React.useRef(new Map<string, Promise<readonly string[]>>());

  return React.useMemo<ChatMentionProvider | undefined>(() => {
    if (repositoryId === undefined || repositoryId === '') {
      return undefined;
    }

    const loadListing = async (): Promise<readonly string[]> => {
      const cached = listingCache.current.get(repositoryId);
      if (cached !== undefined) {
        return cached;
      }
      const pending = inflight.current.get(repositoryId);
      if (pending !== undefined) {
        return pending;
      }

      const request = (async (): Promise<readonly string[]> => {
        const params = new URLSearchParams({ repositoryId });
        const response = await fetch(`/ide/files?${params.toString()}`);
        if (!response.ok) {
          return [];
        }
        const data: IdeFilesResponse = await response.json();
        listingCache.current.set(repositoryId, data.paths);
        return data.paths;
      })();

      inflight.current.set(repositoryId, request);
      try {
        return await request;
      } finally {
        inflight.current.delete(repositoryId);
      }
    };

    return {
      emptyLabel: 'No matching files.',
      loadingLabel: 'Searching files…',
      onQueryFiles: async (query: string): Promise<readonly string[]> => {
        const paths = await loadListing();
        const trimmed = query.trim().toLowerCase();
        const matches =
          trimmed === ''
            ? paths
            : paths.filter((path) => path.toLowerCase().includes(trimmed));
        return matches.slice(0, MAX_MENTION_SUGGESTIONS);
      },
    };
  }, [repositoryId]);
};
