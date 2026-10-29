import { Badge } from '@openthrottle/react-router-shadcn';
import { BotIcon } from 'lucide-react';
import * as React from 'react';

import { BLOG_COPY } from '~/routing/blog/data/data.copy';
import { isAgentEditor } from '~/routing/blog/utils/posts';

export interface BlogEditorBadgeProps {
  readonly lastEditedBy: string | null;
}

/**
 * @description Who last wrote a post. A known agent (service account) renders a
 * violet "Agent" badge with a bot icon next to its name, so agent drafts stand
 * out from a person's edits; a person renders as a plain name; a post last
 * written before edits were recorded renders an em dash.
 */
export const BlogEditorBadge = (
  props: BlogEditorBadgeProps,
): React.ReactElement => {
  const { lastEditedBy } = props;

  // Hooks

  // Setup
  const isAgent = isAgentEditor(lastEditedBy);

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit
  if (lastEditedBy === null) {
    return (
      <span className="text-muted-foreground" data-testid="BlogEditorBadge">
        {BLOG_COPY.noValue}
      </span>
    );
  }

  if (!isAgent) {
    return <span data-testid="BlogEditorBadge">{lastEditedBy}</span>;
  }

  return (
    <span
      className="inline-flex flex-wrap items-center gap-2"
      data-agent="true"
      data-testid="BlogEditorBadge"
    >
      <Badge
        aria-label={BLOG_COPY.agentBadgeHint}
        color="violet"
        data-testid="BlogEditorBadge-agent"
        size="xs"
      >
        <BotIcon aria-hidden="true" />
        {BLOG_COPY.agentBadge}
      </Badge>
      <span className="text-muted-foreground text-xs">{lastEditedBy}</span>
    </span>
  );
};
