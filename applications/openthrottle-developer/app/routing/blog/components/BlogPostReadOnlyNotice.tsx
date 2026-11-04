import { LockIcon } from 'lucide-react';
import * as React from 'react';

import { BLOG_EDITOR_COPY } from '~/routing/blog/data/data.copy';

export interface BlogPostReadOnlyNoticeProps {}

/**
 * @description Explains why there is no form: the post is no longer a draft,
 * and editing it needs `blog:write`.
 */
export const BlogPostReadOnlyNotice = (
  _props: BlogPostReadOnlyNoticeProps,
): React.ReactElement => {
  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div
      className="flex items-start gap-3 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3"
      data-testid="BlogPostReadOnlyNotice"
      role="status"
    >
      <LockIcon
        aria-hidden="true"
        className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400"
      />
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium">{BLOG_EDITOR_COPY.readOnlyTitle}</p>
        <p className="text-muted-foreground text-sm">
          {BLOG_EDITOR_COPY.readOnlyDescription}
        </p>
      </div>
    </div>
  );
};
