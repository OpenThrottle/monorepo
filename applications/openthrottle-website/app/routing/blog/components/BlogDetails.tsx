import { MarkdownRenderer } from '@openthrottle/react-router-markdown';
import { cn } from '@openthrottle/react-router-shadcn';
import * as React from 'react';
import { Link } from 'react-router';

import type { BlogPostQuery } from '~/__generated__/graphql';
import { BLOG_COPY } from '~/routing/blog/data/data.copy';
import { formatBlogDate } from '~/routing/blog/utils/blog-format';
import { BLOG_BASE_PATH } from '~/routing/blog/utils/blog-urls';

import { BlogMeta } from './BlogMeta';
import { BlogTagList } from './BlogTagList';

export interface BlogDetailsProps {
  readonly className?: string;
  readonly post: NonNullable<BlogPostQuery['blogPost']>;
}

export const BlogDetails = (props: BlogDetailsProps): React.ReactElement => {
  const { className, post } = props;
  const { author, bodyMarkdown, coverImageAlt, coverImageUrl, excerpt } = post;

  // Hooks

  // Setup
  const { authorHeading, backToList, updatedPrefix } = BLOG_COPY.details;
  const publishedLabel = formatBlogDate(post.publishedAt);
  const updatedLabel = formatBlogDate(post.updatedAt);
  const showUpdated = updatedLabel !== null && updatedLabel !== publishedLabel;

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <article
      className={cn('mx-auto w-[min(48rem,100%)]', className)}
      data-testid="BlogDetails"
    >
      <header className="flex flex-col gap-5">
        <Link
          className="text-accent text-xs font-semibold tracking-[0.08em] uppercase"
          to={BLOG_BASE_PATH}
        >
          {backToList}
        </Link>
        <h1 className="text-[clamp(1.75rem,4vw,2.6rem)] leading-tight">
          {post.title}
        </h1>
        {excerpt ? (
          <p className="text-muted-foreground text-lg">{excerpt}</p>
        ) : null}
        <BlogMeta
          author={author}
          publishedAt={post.publishedAt}
          readingTimeMinutes={post.readingTimeMinutes}
        />
        {showUpdated ? (
          <p className="text-muted-foreground text-sm">
            {updatedPrefix} {updatedLabel}
          </p>
        ) : null}
        <BlogTagList tags={post.tags} />
      </header>

      {coverImageUrl ? (
        <img
          alt={coverImageAlt ?? ''}
          className="border-border my-8 aspect-video w-full rounded-xl border object-cover"
          decoding="async"
          src={coverImageUrl}
        />
      ) : null}

      <MarkdownRenderer
        className="text-foreground/90! mt-8 text-base! leading-relaxed! [&_h2]:mt-10! [&_h2]:text-2xl! [&_h2]:font-semibold! [&_h3]:mt-8! [&_h3]:text-lg! [&_h3]:font-semibold! [&_ol]:pl-4 [&_ul]:pl-2"
        source={bodyMarkdown}
      />

      {author?.bio ? (
        <aside className="border-border mt-12 border-t pt-6">
          <h2 className="text-muted-foreground mb-2 text-xs font-semibold tracking-[0.08em] uppercase">
            {authorHeading}
          </h2>
          <p className="font-medium">{author.displayName}</p>
          <p className="text-muted-foreground mt-1">{author.bio}</p>
        </aside>
      ) : null}
    </article>
  );
};
