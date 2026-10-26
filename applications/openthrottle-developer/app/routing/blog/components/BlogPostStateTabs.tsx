import { Tabs, TabsList, TabsTrigger } from '@openthrottle/react-router-shadcn';
import * as React from 'react';
import { useSearchParams } from 'react-router';

import type { BlogPostState } from '~/__generated__/graphql';
import {
  BLOG_CURSOR_PARAM,
  BLOG_STATE_PARAM,
  BLOG_STATE_TABS,
} from '~/routing/blog/config/defaults';
import { BLOG_COPY, BLOG_STATE_LABELS } from '~/routing/blog/data/data.copy';
import { parseBlogState, toBlogStateParam } from '~/routing/blog/utils/parsers';

export interface BlogPostStateTabsProps {
  readonly state: BlogPostState;
}

/**
 * @description Drafts · Scheduled · Live · Archived tabs, synced to the `state`
 * URL param. Picking a tab keeps the search query but drops the pagination
 * cursor (a cursor only means something inside one tab's result set).
 */
export const BlogPostStateTabs = (
  props: BlogPostStateTabsProps,
): React.ReactElement => {
  const { state } = props;

  // Hooks
  const [searchParams, setSearchParams] = useSearchParams();

  // Setup

  // Handlers
  const handleValueChange = (value: string): void => {
    const next = new URLSearchParams(searchParams);

    next.set(BLOG_STATE_PARAM, toBlogStateParam(parseBlogState(value)));
    next.delete(BLOG_CURSOR_PARAM);
    setSearchParams(next, { preventScrollReset: true });
  };

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <Tabs
      data-testid="BlogPostStateTabs"
      onValueChange={handleValueChange}
      value={toBlogStateParam(state)}
    >
      <TabsList aria-label={BLOG_COPY.tabsLabel} variant="line">
        {BLOG_STATE_TABS.map((tab) => (
          <TabsTrigger key={tab} value={toBlogStateParam(tab)}>
            {BLOG_STATE_LABELS[tab]}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
};
