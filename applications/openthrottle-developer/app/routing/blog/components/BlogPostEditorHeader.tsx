import { GlobalHeading } from '@openthrottle/react-router-ui-global';
import { PenLineIcon } from 'lucide-react';
import * as React from 'react';

import { BlogEditorBadge } from '~/routing/blog/components/BlogEditorBadge';
import { BlogPostStateBadge } from '~/routing/blog/components/BlogPostStateBadge';
import { BLOG_EDITOR_COPY } from '~/routing/blog/data/data.copy';
import type { BlogEditorPost } from '~/routing/blog/types';

export interface BlogPostEditorHeaderProps {
  /** The action area (save and the lifecycle controls); `null` when read-only. */
  readonly actions: React.ReactNode;
  readonly post: Pick<BlogEditorPost, 'lastEditedBy' | 'slug' | 'state'>;
  /** The title as currently edited, so the heading tracks the form. */
  readonly title: string;
}

/**
 * @description Editor page header: the post title, its lifecycle state, who
 * last edited it (agents flagged), and the action area on the right.
 */
export const BlogPostEditorHeader = (
  props: BlogPostEditorHeaderProps,
): React.ReactElement => {
  const { actions, post, title } = props;

  // Hooks

  // Setup
  const heading = title.trim() || BLOG_EDITOR_COPY.pageTitleFallback;

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <header
      className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"
      data-testid="BlogPostEditorHeader"
    >
      <div className="flex min-w-0 flex-col gap-2">
        <GlobalHeading
          className="min-w-0 break-words"
          heading="h1"
          icon={PenLineIcon}
          title={heading}
        />
        <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
          <BlogPostStateBadge state={post.state} />
          <span className="font-mono">/blog/{post.slug}</span>
          <span className="flex items-center gap-1.5">
            {BLOG_EDITOR_COPY.editedBy}
            <BlogEditorBadge lastEditedBy={post.lastEditedBy ?? null} />
          </span>
        </div>
      </div>
      {actions}
    </header>
  );
};
