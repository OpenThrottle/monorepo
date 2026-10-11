import { Card, CardContent } from '@openthrottle/react-router-shadcn';
import clsx from 'clsx';
import * as React from 'react';
import { Link } from 'react-router';

import type { BlogPostSummaryFragment } from '~/__generated__/graphql';
import { buildBlogPostPath } from '~/routing/blog/utils/blog-urls';

import { BlogMeta } from './BlogMeta';
import { BlogTagList } from './BlogTagList';

export interface BlogPreviewProps {
  readonly className?: string;
  readonly post: BlogPostSummaryFragment;
}

export const BlogPreview = (props: BlogPreviewProps): React.ReactElement => {
  const { className, post } = props;
  const { author, coverImageAlt, coverImageUrl, excerpt, tags, title } = post;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <Card
      className={clsx(
        'group/preview relative gap-0 overflow-hidden py-0 transition-colors',
        'focus-within:border-ring hover:border-accent/60',
        className,
      )}
      data-testid="BlogPreview"
    >
      <article className="flex flex-1 flex-col">
        {coverImageUrl ? (
          <img
            alt={coverImageAlt ?? ''}
            className="aspect-video w-full object-cover"
            decoding="async"
            loading="lazy"
            src={coverImageUrl}
          />
        ) : (
          <div
            aria-hidden="true"
            className="landing-close-ground border-border aspect-video w-full border-b"
          />
        )}
        <CardContent className="flex flex-1 flex-col gap-3 p-5">
          <BlogMeta
            author={author}
            publishedAt={post.publishedAt}
            readingTimeMinutes={post.readingTimeMinutes}
          />
          <h2 className="text-xl leading-snug">
            <Link
              className="after:absolute after:inset-0 after:content-['']"
              to={buildBlogPostPath(post.slug)}
            >
              {title}
            </Link>
          </h2>
          {excerpt ? (
            <p className="text-muted-foreground line-clamp-3 text-[0.975rem]">
              {excerpt}
            </p>
          ) : null}
          <BlogTagList className="relative z-10 mt-auto pt-2" tags={tags} />
        </CardContent>
      </article>
    </Card>
  );
};
