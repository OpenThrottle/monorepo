import * as React from 'react';
import { Button } from '@openthrottle/react-router-shadcn';
import {
  githubPullCompareUrl,
  githubPullConversationUrl,
  githubPullFilesUrl,
  githubRepoWorkflowsDirUrl,
} from '~/routing/pull-requests/utils/github-pr-links';
import type { PullRequestDetailFragment } from '~/__generated__/graphql';

export interface PullRequestDiffLinksProps {
  owner: string;
  pull: PullRequestDetailFragment;
  repo: string;
}

export const PullRequestDiffLinks = (
  props: PullRequestDiffLinksProps,
): React.ReactElement => {
  const { owner, pull, repo } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <>
      <h3 className="text-foreground mb-2 text-xs font-semibold tracking-wide uppercase">
        Diff, conversation, and repo
      </h3>
      <div className="mb-6 flex flex-wrap gap-2">
        {pull.baseRef !== null && pull.headRef !== null ? (
          <Button asChild={true} size="sm" variant="outline">
            <a
              href={githubPullCompareUrl(
                owner,
                repo,
                pull.baseRef ?? '',
                pull.headRef ?? '',
              )}
              rel="noopener noreferrer"
              target="_blank"
            >
              Compare base…head
            </a>
          </Button>
        ) : null}
        <Button asChild={true} size="sm" variant="outline">
          <a
            href={githubPullConversationUrl(owner, repo, pull.number)}
            rel="noopener noreferrer"
            target="_blank"
          >
            Conversation
          </a>
        </Button>
        <Button asChild={true} size="sm" variant="outline">
          <a
            href={githubPullFilesUrl(owner, repo, pull.number)}
            rel="noopener noreferrer"
            target="_blank"
          >
            Files changed
          </a>
        </Button>
        <Button asChild={true} size="sm" variant="outline">
          <a
            href={githubRepoWorkflowsDirUrl(owner, repo)}
            rel="noopener noreferrer"
            target="_blank"
          >
            .github/workflows
          </a>
        </Button>
        <Button asChild={true} size="sm" variant="ghost">
          <a href={pull.htmlUrl} rel="noopener noreferrer" target="_blank">
            Primary GitHub URL
          </a>
        </Button>
      </div>
    </>
  );
};
