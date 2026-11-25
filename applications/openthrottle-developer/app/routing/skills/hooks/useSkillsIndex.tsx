import { readSearchParam } from '@openthrottle/react-router-ui-global';
import {
  parsePaginationLimit,
  parsePaginationPage,
} from '@openthrottle/react-router-utils';
import * as React from 'react';
import { useFetcher, useSearchParams } from 'react-router';

import type { RepoSkillEntry } from '~/routing/agents/data/repo-skills-registry';
import { filterSkillsByQuery } from '~/routing/skills/utils/filterSkillsByQuery';
import type { SkillSourceFilter } from '~/routing/skills/utils/filterSkillsBySource';
import {
  filterSkillsBySource,
  parseSkillSourceFilter,
} from '~/routing/skills/utils/filterSkillsBySource';

export interface UseSkillsIndexOptions {
  readonly entries: readonly RepoSkillEntry[];
}

export interface UseSkillsIndexResult {
  readonly handleSourceFilterChange: (filter: SkillSourceFilter) => void;
  readonly isFiltered: boolean;
  readonly isNewUser: boolean;
  readonly limit: number;
  readonly page: number;
  readonly pageEntries: RepoSkillEntry[];
  readonly pendingSlug: string | undefined;
  readonly sourceFilter: SkillSourceFilter;
  readonly submitTagIntent: (
    intent: string,
    slug: string,
    tag?: string,
  ) => void;
  readonly totalCount: number;
}

/**
 * @description Search-param-owned filtering, pagination and tag-intent
 * submission for the skills index. Extracted from the route per
 * route-primitive-shape R4.
 */
export const useSkillsIndex = (
  options: UseSkillsIndexOptions,
): UseSkillsIndexResult => {
  const { entries } = options;

  // Hooks
  const [searchParams, setSearchParams] = useSearchParams();
  const tagFetcher = useFetcher();

  // Setup
  // The URL owns the source filter (no useState): refresh, Back/Forward, and a
  // shared link all restore the same segment. `all` is the default and is
  // written as an *absent* param, so bare `/skills` is the canonical full list.
  const sourceFilter = parseSkillSourceFilter(searchParams.get('source'));
  const search = readSearchParam(searchParams);
  const filteredEntries = React.useMemo(() => {
    return [
      ...filterSkillsByQuery(
        filterSkillsBySource(entries, sourceFilter),
        search,
      ),
    ];
  }, [entries, search, sourceFilter]);
  // A genuinely-new user has no discovered SKILL.md at all and no active
  // search/source filter — show the teaching pitch instead of the toolbar,
  // table, and pager. Gated on the pre-filter `entries` so a zero-result
  // *filtered* view still falls through to SkillsTable -> SkillsEmpty with its
  // clear-search affordance.
  const isFiltered = search.trim().length > 0 || sourceFilter !== 'all';
  const isNewUser = entries.length === 0 && !isFiltered;
  const isTagging = tagFetcher.state !== 'idle';
  const taggingSlug = String(tagFetcher.formData?.get('slug') ?? '');
  const pendingSlug = isTagging ? taggingSlug : undefined;

  const limit = parsePaginationLimit(searchParams.get('limit'));
  const totalCount = filteredEntries.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / limit));
  // Clamp so a stale/out-of-range ?page never renders an empty slice.
  const page = Math.min(
    parsePaginationPage(searchParams.get('page')),
    totalPages,
  );

  const offset = (page - 1) * limit;
  const pageEntries = React.useMemo(() => {
    return filteredEntries.slice(offset, offset + limit);
  }, [filteredEntries, limit, offset]);

  // Handlers
  const handleSourceFilterChange = (filter: SkillSourceFilter): void => {
    // One mutation: write (or clear) `source` and reset to page 1 so the user
    // is never stranded on an out-of-range page after the filtered set
    // shrinks. Sibling params (`search`, `limit`, `modal`) are preserved, and
    // this is a push so Back undoes the filter change.
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (filter === 'all') {
          next.delete('source');
        } else {
          next.set('source', filter);
        }
        next.delete('page');

        return next;
      },
      { preventScrollReset: true },
    );
  };

  const submitTagIntent = (
    intent: string,
    slug: string,
    tag?: string,
  ): void => {
    const payload: Record<string, string> = { intent, slug };
    if (tag != null) {
      payload.tag = tag;
    }
    void tagFetcher.submit(payload, { method: 'post' });
  };

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return {
    handleSourceFilterChange,
    isFiltered,
    isNewUser,
    limit,
    page,
    pageEntries,
    pendingSlug,
    sourceFilter,
    submitTagIntent,
    totalCount,
  };
};
