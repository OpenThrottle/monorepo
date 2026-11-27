import { Badge } from '@openthrottle/react-router-shadcn';
import { GitPullRequest } from 'lucide-react';
import * as React from 'react';

import { CHAT_SESSION_DRAWER_COPY } from '../data/copy';
import type { ChatSessionDiffPullRequest } from '../types';
import { fillTemplate } from '../utils/fillTemplate';
import { formatPullRequestState } from '../utils/session-diff';

export interface ChatSessionDrawerPullRequestChipProps {
  readonly pullRequest: ChatSessionDiffPullRequest;
}

/**
 * @description The checkout branch's pull request as a `#N state` badge, linking to it in a
 * new tab. Sits on the Environment section's branch row.
 *
 * @public
 */
export const ChatSessionDrawerPullRequestChip = (
  props: ChatSessionDrawerPullRequestChipProps,
): React.ReactElement => {
  const { pullRequest } = props;

  // Hooks

  // Setup
  const copy = CHAT_SESSION_DRAWER_COPY.pullRequest;
  const values = {
    number: `${pullRequest.number}`,
    state: formatPullRequestState(pullRequest),
  };

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <Badge
      asChild={true}
      className="shrink-0"
      data-testid="ChatSessionDrawerPullRequestChip"
    >
      <a
        href={pullRequest.url}
        rel="noopener noreferrer"
        target="_blank"
        title={fillTemplate(copy.title, values)}
      >
        <GitPullRequest aria-hidden={true} className="size-3" />
        {fillTemplate(copy.chip, values)}
      </a>
    </Badge>
  );
};
