import { toast } from '@openthrottle/react-router-shadcn';
import * as React from 'react';
import { useFetcher } from 'react-router';

import { BlogPostState } from '~/__generated__/graphql';
import { BLOG_POST_LIFECYCLE_INTENT } from '~/routing/blog/config/defaults';
import { BLOG_LIFECYCLE_COPY } from '~/routing/blog/data/data.copy';
import type {
  BlogPostLifecycleRequest,
  BlogPostLifecycleResult,
} from '~/routing/blog/types';
import { isBlogPostLifecycleResult } from '~/routing/blog/utils/lifecycle-results';

export interface UseBlogPostLifecycleResult {
  readonly archive: () => void;
  readonly isPending: boolean;
  /** Publishes now (`null`), or schedules for a UTC ISO timestamp. */
  readonly publish: (publishedAt: string | null) => void;
  /** The last action's outcome, or `null` before the first. */
  readonly result: BlogPostLifecycleResult | null;
  readonly unpublish: () => void;
}

const announce = (result: BlogPostLifecycleResult): void => {
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

/**
 * @description Submits lifecycle actions (publish or schedule, unpublish,
 * archive) to the current route's action as JSON through a fetcher, so they
 * never navigate. Each finished action raises one toast; the route's
 * `shouldRevalidate` then refetches the post, so the state badge and the
 * "Scheduled for" line follow the server.
 */
export const useBlogPostLifecycle = (): UseBlogPostLifecycleResult => {
  // Hooks
  const fetcher = useFetcher();
  const announced = React.useRef<BlogPostLifecycleResult | null>(null);

  // Setup
  const result = isBlogPostLifecycleResult(fetcher.data) ? fetcher.data : null;

  // Handlers
  const submit = (request: BlogPostLifecycleRequest): void => {
    void fetcher.submit(
      { ...request },
      { encType: 'application/json', method: 'post' },
    );
  };

  const archive = (): void =>
    submit({ intent: BLOG_POST_LIFECYCLE_INTENT.ARCHIVE });
  const unpublish = (): void =>
    submit({ intent: BLOG_POST_LIFECYCLE_INTENT.UNPUBLISH });
  const publish = (publishedAt: string | null): void =>
    submit({ intent: BLOG_POST_LIFECYCLE_INTENT.PUBLISH, publishedAt });

  // Markup

  // Life Cycle
  React.useEffect(() => {
    if (result !== null && result !== announced.current) {
      announced.current = result;
      announce(result);
    }
  }, [result]);

  // 🔌 Short Circuit

  return {
    archive,
    isPending: fetcher.state !== 'idle',
    publish,
    result,
    unpublish,
  };
};
