import { CalendarClockIcon } from 'lucide-react';
import * as React from 'react';

import { useIsHydrated } from '~/global/hooks/useIsHydrated';
import { formatBlogScheduledFor } from '~/routing/blog/utils/lifecycle';

export interface BlogPostScheduledForProps {
  /** The go-live time as a UTC ISO timestamp. */
  readonly publishedAt: string;
}

/**
 * @description "Scheduled for Nov 1, 2026, 9:00 AM (PST)": when a scheduled post
 * goes live, in the viewer's own time zone. The server cannot know that zone,
 * so the server render and the hydrating render pin UTC and the local zone
 * takes over right after hydration.
 */
export const BlogPostScheduledFor = (
  props: BlogPostScheduledForProps,
): React.ReactElement => {
  const { publishedAt } = props;

  // Hooks
  const hydrated = useIsHydrated();

  // Setup
  const label = formatBlogScheduledFor(
    publishedAt,
    hydrated ? undefined : 'UTC',
  );

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <p
      className="text-muted-foreground flex items-center gap-1.5 text-xs"
      data-testid="BlogPostScheduledFor"
    >
      <CalendarClockIcon className="size-3.5" />
      {label}
    </p>
  );
};
