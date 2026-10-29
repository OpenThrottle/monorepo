import { BlogPostState } from '~/__generated__/graphql';
import type { BlogPostLifecycleAction } from '~/routing/blog/types';

/**
 * The lifecycle controls each state offers, in display order. Mirrors what the
 * server allows (`publishPost` works from any state, `unpublishPost` returns
 * any state to DRAFT, `archivePost` archives from any state), narrowed to the
 * moves that make sense for the state.
 *
 * - DRAFT: publish now or schedule.
 * - SCHEDULED: change the date, or take it back to draft.
 * - LIVE: take it down to draft, or archive it.
 * - ARCHIVED: publish it again, or move it back to draft.
 */
export const BLOG_LIFECYCLE_ACTIONS: Record<
  BlogPostState,
  readonly BlogPostLifecycleAction[]
> = {
  [BlogPostState.Archived]: ['publish', 'moveToDraft'],
  [BlogPostState.Draft]: ['publish'],
  [BlogPostState.Live]: ['unpublish', 'archive'],
  [BlogPostState.Scheduled]: ['reschedule', 'unpublish'],
};
