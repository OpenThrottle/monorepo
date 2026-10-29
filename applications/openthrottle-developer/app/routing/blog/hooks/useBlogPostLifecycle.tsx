import * as React from 'react';
import { useFetcher } from 'react-router';

import { BLOG_POST_LIFECYCLE_INTENT } from '~/routing/blog/config/defaults';
import type {
  BlogPostLifecycleRequest,
  BlogPostLifecycleResult,
} from '~/routing/blog/types';
import {
  announceBlogPostLifecycleResult,
  isBlogPostLifecycleResult,
} from '~/routing/blog/utils/lifecycle';

export interface UseBlogPostLifecycleResult {
  readonly archive: () => void;
  readonly isPending: boolean;
  /** Publishes now (`null`), or schedules for a UTC ISO timestamp. */
  readonly publish: (publishedAt: string | null) => void;
  /** The last action's outcome, or `null` before the first. */
  readonly result: BlogPostLifecycleResult | null;
  readonly unpublish: () => void;
}

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
      announceBlogPostLifecycleResult(result);
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
