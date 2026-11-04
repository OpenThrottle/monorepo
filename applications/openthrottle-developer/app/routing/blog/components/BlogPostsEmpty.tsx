import {
  Button,
  Empty,
  EmptyDescription,
  EmptyMedia,
  EmptyTitle,
} from '@openthrottle/react-router-shadcn';
import { GlobalFeatureOnboarding } from '@openthrottle/react-router-ui-global';
import { SearchXIcon } from 'lucide-react';
import * as React from 'react';
import { Link, useSearchParams } from 'react-router';

import { BlogPostState } from '~/__generated__/graphql';
import {
  BLOG_CURSOR_PARAM,
  BLOG_SEARCH_PARAM,
} from '~/routing/blog/config/defaults';
import {
  BLOG_EMPTY_COPY,
  BLOG_ONBOARDING,
  BLOG_SEARCH_EMPTY_COPY,
} from '~/routing/blog/data/data.copy';

export interface BlogPostsEmptyProps {
  /** The committed `q` query, or `null` when none is applied. */
  readonly search: string | null;
  readonly state: BlogPostState;
}

/**
 * @description Empty state for one tab. A search with no hits offers to clear it;
 * an empty Drafts tab shows the shared feature-onboarding pitch; Scheduled, Live
 * and Archived each get their own short explanation.
 */
export const BlogPostsEmpty = (
  props: BlogPostsEmptyProps,
): React.ReactElement => {
  const { search, state } = props;

  // Hooks
  const [searchParams] = useSearchParams();

  // Setup
  const clearSearchParams = new URLSearchParams(searchParams);

  clearSearchParams.delete(BLOG_SEARCH_PARAM);
  clearSearchParams.delete(BLOG_CURSOR_PARAM);

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit
  if (search !== null) {
    return (
      <Empty className="my-8" data-testid="BlogPostsEmpty-search">
        <EmptyMedia variant="icon">
          <SearchXIcon className="size-6" />
        </EmptyMedia>
        <EmptyTitle>{BLOG_SEARCH_EMPTY_COPY.title}</EmptyTitle>
        <EmptyDescription>
          {BLOG_SEARCH_EMPTY_COPY.description}
        </EmptyDescription>
        <Button asChild={true} variant="secondary">
          <Link to={{ search: clearSearchParams.toString() }}>
            {BLOG_SEARCH_EMPTY_COPY.clear}
          </Link>
        </Button>
      </Empty>
    );
  }

  if (state === BlogPostState.Draft) {
    return (
      <div data-testid="BlogPostsEmpty-onboarding">
        <GlobalFeatureOnboarding content={BLOG_ONBOARDING} />
      </div>
    );
  }

  const copy = BLOG_EMPTY_COPY[state];
  const Icon = copy.icon;

  return (
    <Empty className="my-8" data-testid="BlogPostsEmpty">
      <EmptyMedia variant="icon">
        <Icon className="size-6" />
      </EmptyMedia>
      <EmptyTitle>{copy.title}</EmptyTitle>
      <EmptyDescription>{copy.description}</EmptyDescription>
    </Empty>
  );
};
