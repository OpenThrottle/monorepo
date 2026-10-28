import type {
  ChatSlashCommand,
  ChatSlashCommandProvider,
} from '@openthrottle/react-router-chat';
import * as React from 'react';

import { MAX_SKILL_SUGGESTIONS } from '~/routing/home/config/composer-suggestions';
import type { SkillsAutocompleteResponse } from '~/routing/skills/utils/autocomplete-entries';

/**
 * Build the composer's `/`-command {@link ChatSlashCommandProvider}. Unlike the
 * `@`-mention provider (keyed per repository), skills are global to the running
 * checkout, so the provider is always returned — the composer surfaces the `/`
 * trigger regardless of the selected model/repository.
 *
 * The full skill list is fetched once from the `/skills/autocomplete` resource
 * route and cached for the session; subsequent keystrokes fuzzy-filter the
 * cached list client-side (by slug + description), so there is no per-keystroke
 * network round-trip. Concurrent first-fetches are de-duplicated. On a deployed
 * app with no checkout the route returns an empty list, so the popover just
 * shows the empty label.
 */
export const useSkillCommandProvider = (): ChatSlashCommandProvider => {
  // Hooks
  // Kept in refs so the cache survives re-renders and popover open/close cycles.
  const listingCache = React.useRef<readonly ChatSlashCommand[] | null>(null);
  const inflight = React.useRef<Promise<readonly ChatSlashCommand[]> | null>(
    null,
  );

  // Setup
  const provider = React.useMemo<ChatSlashCommandProvider>(() => {
    const loadListing = async (): Promise<readonly ChatSlashCommand[]> => {
      if (listingCache.current !== null) {
        return listingCache.current;
      }
      if (inflight.current !== null) {
        return inflight.current;
      }

      const request = (async (): Promise<readonly ChatSlashCommand[]> => {
        const response = await fetch('/skills/autocomplete');
        if (!response.ok) {
          return [];
        }
        const data: SkillsAutocompleteResponse = await response.json();
        const skills = data.skills.map((skill): ChatSlashCommand => ({
          description: skill.description,
          disabledForModel: skill.disabledForModel,
          slug: skill.slug,
        }));
        listingCache.current = skills;
        return skills;
      })();

      inflight.current = request;
      try {
        return await request;
      } finally {
        inflight.current = null;
      }
    };

    return {
      emptyLabel: 'No matching skills.',
      loadingLabel: 'Searching skills…',
      onQuerySkills: async (
        query: string,
      ): Promise<readonly ChatSlashCommand[]> => {
        const skills = await loadListing();
        const trimmed = query.trim().toLowerCase();
        const matches =
          trimmed === ''
            ? skills
            : skills.filter(
                (skill) =>
                  skill.slug.toLowerCase().includes(trimmed) ||
                  skill.description.toLowerCase().includes(trimmed),
              );
        return matches.slice(0, MAX_SKILL_SUGGESTIONS);
      },
    };
  }, []);

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return provider;
};
