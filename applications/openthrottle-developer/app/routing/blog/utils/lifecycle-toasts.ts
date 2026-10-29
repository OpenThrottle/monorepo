import { toast } from '@openthrottle/react-router-shadcn';

import { BlogPostState } from '~/__generated__/graphql';
import { BLOG_LIFECYCLE_COPY } from '~/routing/blog/data/data.copy';
import type { BlogPostLifecycleResult } from '~/routing/blog/types';

/**
 * @description Raises the one toast a finished lifecycle action owes: success
 * for archive, publish, schedule and unpublish, error otherwise.
 */
export const announceBlogPostLifecycleResult = (
  result: BlogPostLifecycleResult,
): void => {
  switch (result.outcome) {
    case 'archived':
      toast.success(BLOG_LIFECYCLE_COPY.toasts.archived);
      break;
    case 'lifecycleError':
    case 'lifecycleNotFound':
      toast.error(result.message);
      break;
    case 'published':
      toast.success(
        result.state === BlogPostState.Scheduled
          ? BLOG_LIFECYCLE_COPY.toasts.scheduled
          : BLOG_LIFECYCLE_COPY.toasts.published,
      );
      break;
    case 'unpublished':
      toast.success(BLOG_LIFECYCLE_COPY.toasts.unpublished);
      break;
  }
};
