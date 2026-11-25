import type { BadgeProps } from '@openthrottle/react-router-shadcn';

import { BlogPostState } from '~/__generated__/graphql';

/** Badge colour for each post state: one hue per lifecycle stage. */
export const BLOG_STATE_BADGE_COLOR: Record<
  BlogPostState,
  NonNullable<BadgeProps['color']>
> = {
  [BlogPostState.Archived]: 'slate',
  [BlogPostState.Draft]: 'sky',
  [BlogPostState.Live]: 'green',
  [BlogPostState.Scheduled]: 'amber',
};
