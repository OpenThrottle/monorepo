import * as React from 'react';
import { Button } from '@openthrottle/react-router-shadcn';
import {
  githubCommitChecksUrl,
  githubCommitUrl,
  githubPullChecksUrl,
  githubPullCommitsUrl,
} from '~/routing/pull-requests/utils/github-pr-links';
import type { GetPullRequestDetailQuery } from '~/__generated__/graphql';

export interface PullRequestChecksLinksProps {
  owner: string;
  pull: NonNullable<GetPullRequestDetailQuery['pull']>;
  repo: string;
}

export const PullRequestChecksLinks = (
  props: PullRequestChecksLinksProps,
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
        Checks and commit status
      </h3>
      <div className="mb-6 flex flex-wrap gap-2">
        <Button asChild={true} size="sm" variant="default">
          <a
            href={githubPullChecksUrl(owner, repo, pull.number)}
            rel="noopener noreferrer"
            target="_blank"
          >
            Checks tab (CI rollup)
          </a>
        </Button>
        <Button asChild={true} size="sm" variant="outline">
          <a
            href={githubPullCommitsUrl(owner, repo, pull.number)}
            rel="noopener noreferrer"
            target="_blank"
          >
            Commits (per-SHA checks)
          </a>
        </Button>
        {pull.headSha !== null ? (
          <>
            <Button asChild={true} size="sm" variant="secondary">
              <a
                href={githubCommitChecksUrl(owner, repo, pull.headSha ?? '')}
                rel="noopener noreferrer"
                target="_blank"
              >
                Checks at head SHA
              </a>
            </Button>
            <Button asChild={true} size="sm" variant="outline">
              <a
                href={githubCommitUrl(owner, repo, pull.headSha ?? '')}
                rel="noopener noreferrer"
                target="_blank"
              >
                Head commit{' '}
                <span className="font-mono">{pull.headSha?.slice(0, 7)}</span>
              </a>
            </Button>
          </>
        ) : null}
      </div>
    </>
  );
};
