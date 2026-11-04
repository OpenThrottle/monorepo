import { Button } from '@openthrottle/react-router-shadcn';
import { GlobalToolbarSearch } from '@openthrottle/react-router-ui-global';
import { PlusIcon } from 'lucide-react';
import * as React from 'react';
import { Form, useNavigation } from 'react-router';

import {
  BLOG_CURSOR_PARAM,
  BLOG_NEW_POST_PATH,
  BLOG_SEARCH_PARAM,
} from '~/routing/blog/config/defaults';
import { BLOG_COPY } from '~/routing/blog/data/data.copy';

export interface BlogPostsToolbarProps {}

/**
 * @description Toolbar for the post list: submit-to-URL search (`q`) and the
 * "New post" button. Searching drops the pagination cursor, because a cursor
 * belongs to one result set and is meaningless against another. "New post"
 * POSTs to `/blog/new`, which creates a draft and redirects to its editor; a
 * link would make creation a GET side effect.
 */
export const BlogPostsToolbar = (
  _props: BlogPostsToolbarProps,
): React.ReactElement => {
  // Hooks
  const navigation = useNavigation();

  // Setup
  const isCreating =
    navigation.state !== 'idle' && navigation.formAction === BLOG_NEW_POST_PATH;

  // Handlers
  const resetCursor = (next: URLSearchParams): void => {
    next.delete(BLOG_CURSOR_PARAM);
  };

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div
      className="flex w-full flex-wrap items-center gap-2"
      data-testid="BlogPostsToolbar"
    >
      <GlobalToolbarSearch
        aria-label={BLOG_COPY.searchLabel}
        paramKey={BLOG_SEARCH_PARAM}
        placeholder={BLOG_COPY.searchPlaceholder}
        transformCommittedParams={resetCursor}
      />
      <div className="min-w-0 flex-1" />
      <Form action={BLOG_NEW_POST_PATH} method="post">
        <Button
          className="shrink-0"
          disabled={isCreating}
          type="submit"
          variant="outline"
        >
          <PlusIcon className="size-4" /> {BLOG_COPY.newPost}
        </Button>
      </Form>
    </div>
  );
};
