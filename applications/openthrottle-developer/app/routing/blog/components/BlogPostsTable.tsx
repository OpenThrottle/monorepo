import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from '@openthrottle/react-router-shadcn';
import * as React from 'react';

import type { BlogPostListRowFragment } from '~/__generated__/graphql';
import { useIsHydrated } from '~/global/hooks/useIsHydrated';
import { BLOG_COPY } from '~/routing/blog/data/data.copy';

import { BlogPostRow } from './BlogPostRow';

export interface BlogPostsTableProps {
  readonly posts: readonly BlogPostListRowFragment[];
}

/**
 * @description The post list as a table. Dates render in UTC (labelled) on the
 * server and the hydrating render, then switch to the viewer's local zone once
 * hydrated, so the server HTML and the first client render always match.
 */
export const BlogPostsTable = (
  props: BlogPostsTableProps,
): React.ReactElement => {
  const { posts } = props;

  // Hooks
  const hydrated = useIsHydrated();

  // Setup
  const timeZone = hydrated ? undefined : 'UTC';

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <Table data-testid="BlogPostsTable">
      <TableHeader>
        <TableRow>
          <TableHead>{BLOG_COPY.columns.title}</TableHead>
          <TableHead>{BLOG_COPY.columns.state}</TableHead>
          <TableHead>{BLOG_COPY.columns.author}</TableHead>
          <TableHead>{BLOG_COPY.columns.published}</TableHead>
          <TableHead>{BLOG_COPY.columns.updated}</TableHead>
          <TableHead>{BLOG_COPY.columns.lastEditedBy}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {posts.map((post) => (
          <BlogPostRow key={post.id} post={post} timeZone={timeZone} />
        ))}
      </TableBody>
    </Table>
  );
};
