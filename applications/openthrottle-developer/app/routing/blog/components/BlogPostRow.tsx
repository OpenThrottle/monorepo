import { TableCell, TableRow } from '@openthrottle/react-router-shadcn';
import clsx from 'clsx';
import * as React from 'react';
import { Link } from 'react-router';

import type { BlogPostListRowFragment } from '~/__generated__/graphql';
import { formatDateTime } from '~/global/utils/dates';
import { BLOG_COPY } from '~/routing/blog/data/data.copy';
import {
  formatBlogPublishedLabel,
  isAgentEditor,
} from '~/routing/blog/utils/posts';

import { BlogEditorBadge } from './BlogEditorBadge';
import { BlogPostStateBadge } from './BlogPostStateBadge';

export interface BlogPostRowProps {
  readonly post: BlogPostListRowFragment;
  /** IANA zone to format dates in; `undefined` uses the viewer's local zone. */
  readonly timeZone: string | undefined;
}

/**
 * @description One post in the list: title and slug, state, author, when it
 * publishes, when it last changed, and who edited it. A row last written by an
 * agent gets a violet tint and edge so agent drafts stand out at a glance.
 */
export const BlogPostRow = (props: BlogPostRowProps): React.ReactElement => {
  const { post, timeZone } = props;

  // Hooks

  // Setup
  const isAgentEdit = isAgentEditor(post.lastEditedBy ?? null);
  const publishedLabel = formatBlogPublishedLabel(
    post.state,
    post.publishedAt,
    timeZone,
  );

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <TableRow
      className={clsx(
        isAgentEdit &&
          'border-l-2 border-l-violet-500 bg-violet-500/5 hover:bg-violet-500/10',
      )}
      data-agent-edit={isAgentEdit}
      data-testid="BlogPostRow"
    >
      <TableCell className="max-w-80">
        <Link
          className="font-medium hover:underline"
          to={`/blog/${post.id}`}
          viewTransition={true}
        >
          {post.title}
        </Link>
        <div className="text-muted-foreground truncate font-mono text-xs">
          {post.slug}
        </div>
      </TableCell>
      <TableCell>
        <BlogPostStateBadge state={post.state} />
      </TableCell>
      <TableCell>{post.author?.displayName ?? BLOG_COPY.noValue}</TableCell>
      <TableCell className="whitespace-nowrap">{publishedLabel}</TableCell>
      <TableCell className="whitespace-nowrap">
        {formatDateTime(post.updatedAt, { timeZone, withTimeZoneName: true })}
      </TableCell>
      <TableCell>
        <BlogEditorBadge lastEditedBy={post.lastEditedBy ?? null} />
      </TableCell>
    </TableRow>
  );
};
