import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@openthrottle/react-router-shadcn';
import clsx from 'clsx';
import * as React from 'react';

import type { BlogPostSummaryFragment } from '~/__generated__/graphql';
import { BLOG_COPY } from '~/routing/blog/data/data.copy';
import {
  formatBlogDate,
  getBlogAuthorInitials,
  toBlogIsoDate,
} from '~/routing/blog/utils/blog-format';

export interface BlogMetaProps {
  readonly author: BlogPostSummaryFragment['author'];
  readonly className?: string;
  readonly publishedAt: BlogPostSummaryFragment['publishedAt'];
  readonly readingTimeMinutes: BlogPostSummaryFragment['readingTimeMinutes'];
}

export const BlogMeta = (props: BlogMetaProps): React.ReactElement => {
  const { author, className, publishedAt, readingTimeMinutes } = props;

  // Hooks

  // Setup
  const { byPrefix, readingTime } = BLOG_COPY.meta;
  const publishedLabel = formatBlogDate(publishedAt);
  const publishedIso = toBlogIsoDate(publishedAt);

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div
      className={clsx(
        'text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 text-sm',
        className,
      )}
      data-testid="BlogMeta"
    >
      {author ? (
        <span className="flex items-center gap-2" data-testid="BlogMetaAuthor">
          <Avatar size="sm">
            {author.avatarUrl ? (
              <AvatarImage alt="" src={author.avatarUrl} />
            ) : null}
            <AvatarFallback aria-hidden="true">
              {getBlogAuthorInitials(author.displayName)}
            </AvatarFallback>
          </Avatar>
          <span>
            {byPrefix}{' '}
            <span className="text-foreground font-medium">
              {author.displayName}
            </span>
          </span>
        </span>
      ) : null}
      {publishedLabel && publishedIso ? (
        <time dateTime={publishedIso}>{publishedLabel}</time>
      ) : null}
      <span>{readingTime(readingTimeMinutes)}</span>
    </div>
  );
};
