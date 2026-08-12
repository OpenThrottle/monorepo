import * as React from 'react';
import { Button } from '@openthrottle/react-router-shadcn';
import {
  githubRepoActionsForBranchUrl,
  githubRepoActionsForPullRequestHeadRefUrl,
  githubRepoActionsForPullRequestMergeRefUrl,
  githubRepoActionsPullRequestRunsUrl,
  githubRepoActionsUrl,
} from '~/routing/pull-requests/utils/github-pr-links';
import type { GetPullRequestDetailQuery } from '~/__generated__/graphql';

export interface PullRequestActionsLinksProps {
  owner: string;
  pull: NonNullable<GetPullRequestDetailQuery['pull']>;
  repo: string;
}

export const PullRequestActionsLinks = (
  props: PullRequestActionsLinksProps,
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
        Workflow runs (Actions)
      </h3>
      <div className="mb-6 flex flex-wrap gap-2">
        {pull.headRef !== null ? (
          <Button asChild={true} size="sm" variant="outline">
            <a
              href={githubRepoActionsForBranchUrl(
                owner,
                repo,
                pull.headRef ?? '',
              )}
              rel="noopener noreferrer"
              target="_blank"
            >
              Actions (branch name)
            </a>
          </Button>
        ) : null}
        <Button asChild={true} size="sm" variant="outline">
          <a
            href={githubRepoActionsForPullRequestHeadRefUrl(
              owner,
              repo,
              pull.number,
            )}
            rel="noopener noreferrer"
            target="_blank"
          >
            Actions (refs/pull/{pull.number}/head)
          </a>
        </Button>
        <Button asChild={true} size="sm" variant="outline">
          <a
            href={githubRepoActionsForPullRequestMergeRefUrl(
              owner,
              repo,
              pull.number,
            )}
            rel="noopener noreferrer"
            target="_blank"
          >
            Actions (refs/pull/{pull.number}/merge)
          </a>
        </Button>
        <Button asChild={true} size="sm" variant="outline">
          <a
            href={githubRepoActionsPullRequestRunsUrl(owner, repo)}
            rel="noopener noreferrer"
            target="_blank"
          >
            Actions (event:pull_request)
          </a>
        </Button>
        <Button asChild={true} size="sm" variant="outline">
          <a
            href={githubRepoActionsUrl(owner, repo)}
            rel="noopener noreferrer"
            target="_blank"
          >
            All repo actions
          </a>
        </Button>
      </div>
    </>
  );
};
