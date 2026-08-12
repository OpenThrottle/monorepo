import * as React from 'react';
import { Link } from 'react-router';
import { Button } from '@openthrottle/react-router-shadcn';
import { PullRequestDetailHeader } from '~/routing/pull-requests/components/PullRequestDetailHeader';
import { PullRequestGithubCard } from '~/routing/pull-requests/components/PullRequestGithubCard';
import type { GetPullRequestDetailQuery } from '~/__generated__/graphql';

export interface PullRequestDetailProps {
  listQuery: string;
  owner: string;
  pull: NonNullable<GetPullRequestDetailQuery['pull']>;
  repo: string;
}

export const PullRequestDetail = (
  props: PullRequestDetailProps,
): React.ReactElement => {
  const { listQuery, owner, pull, repo } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <>
      <PullRequestDetailHeader pull={pull} />

      <PullRequestGithubCard owner={owner} pull={pull} repo={repo} />

      <div className="mt-6 flex flex-wrap gap-2">
        <Button asChild={true} size="sm" variant="outline">
          <Link
            to={
              listQuery === ''
                ? '/pull-requests'
                : `/pull-requests?${listQuery}`
            }
            viewTransition={true}
          >
            Back to list
          </Link>
        </Button>
      </div>
    </>
  );
};
