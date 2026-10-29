import { MarkdownRenderer } from '@openthrottle/react-router-markdown';
import clsx from 'clsx';
import * as React from 'react';

import { BLOG_EDITOR_COPY } from '~/routing/blog/data/data.copy';
import type { BlogPostEditorValues } from '~/routing/blog/types';

export interface BlogPostPreviewProps {
  readonly className?: string;
  readonly values: Pick<
    BlogPostEditorValues,
    'bodyMarkdown' | 'coverImageAlt' | 'coverImageUrl' | 'excerpt' | 'title'
  >;
}

/**
 * @description Live preview of the post as readers will see it: a simple
 * header (cover, title, excerpt) above the body rendered by the same
 * `MarkdownRenderer` and stylesheet the public website uses.
 */
export const BlogPostPreview = (
  props: BlogPostPreviewProps,
): React.ReactElement => {
  const { className, values } = props;
  const { bodyMarkdown, coverImageAlt, coverImageUrl, excerpt, title } = values;

  // Hooks

  // Setup
  const hasBody = bodyMarkdown.trim() !== '';

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <article
      aria-label={BLOG_EDITOR_COPY.preview}
      className={clsx(
        'bg-card border-border relative overflow-hidden rounded-lg border',
        className,
      )}
      data-testid="BlogPostPreview"
    >
      <div className="border-border bg-muted/40 text-muted-foreground flex items-center gap-2 border-b px-5 py-2 text-[11px] font-semibold tracking-[0.12em] uppercase">
        <span
          aria-hidden="true"
          className="size-1.5 rounded-full bg-emerald-500"
        />
        {BLOG_EDITOR_COPY.preview}
      </div>
      <div className="mx-auto flex w-[min(44rem,100%)] flex-col px-6 py-8">
        {coverImageUrl.trim() !== '' ? (
          <img
            alt={coverImageAlt}
            className="border-border mb-8 aspect-video w-full rounded-xl border object-cover"
            decoding="async"
            src={coverImageUrl}
          />
        ) : null}
        <h2 className="text-[clamp(1.6rem,3vw,2.3rem)] leading-tight font-semibold tracking-tight">
          {title}
        </h2>
        {excerpt.trim() !== '' ? (
          <p className="text-muted-foreground mt-4 text-lg">{excerpt}</p>
        ) : null}
        <hr className="border-border my-8" />
        {hasBody ? (
          <MarkdownRenderer
            className="text-foreground/90! text-base! leading-relaxed! [&_h2]:mt-10! [&_h2]:text-2xl! [&_h2]:font-semibold! [&_h3]:mt-8! [&_h3]:text-lg! [&_h3]:font-semibold! [&_ol]:pl-4 [&_ul]:pl-2"
            source={bodyMarkdown}
          />
        ) : (
          <p className="text-muted-foreground text-sm italic">
            {BLOG_EDITOR_COPY.previewEmptyBody}
          </p>
        )}
      </div>
    </article>
  );
};
