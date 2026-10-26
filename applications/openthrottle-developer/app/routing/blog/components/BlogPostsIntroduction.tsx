import { GlobalHeading } from '@openthrottle/react-router-ui-global';
import { BookOpenIcon } from 'lucide-react';
import * as React from 'react';

import { BLOG_COPY } from '~/routing/blog/data/data.copy';

export interface BlogPostsIntroductionProps {}

/**
 * @description Heading and standing description for the `/blog` post list.
 */
export const BlogPostsIntroduction = (
  _props: BlogPostsIntroductionProps,
): React.ReactElement => {
  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div data-testid="BlogPostsIntroduction">
      <GlobalHeading
        className="mb-4"
        heading="h1"
        icon={BookOpenIcon}
        title={BLOG_COPY.pageTitle}
      />
      <p className="text-muted-foreground text-sm">
        {BLOG_COPY.pageDescription}
      </p>
    </div>
  );
};
