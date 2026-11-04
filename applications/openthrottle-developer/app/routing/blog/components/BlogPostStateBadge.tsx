import { Badge } from '@openthrottle/react-router-shadcn';
import * as React from 'react';

import type { BlogPostState } from '~/__generated__/graphql';
import { BLOG_STATE_BADGE_LABELS } from '~/routing/blog/data/data.copy';
import { BLOG_STATE_BADGE_COLOR } from '~/routing/blog/data/data.state-badge';

export interface BlogPostStateBadgeProps {
  readonly state: BlogPostState;
}

/**
 * @description Lifecycle badge for one post: Draft, Scheduled, Live or Archived.
 */
export const BlogPostStateBadge = (
  props: BlogPostStateBadgeProps,
): React.ReactElement => {
  const { state } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <Badge
      color={BLOG_STATE_BADGE_COLOR[state]}
      data-testid="BlogPostStateBadge"
      size="xs"
    >
      {BLOG_STATE_BADGE_LABELS[state]}
    </Badge>
  );
};
