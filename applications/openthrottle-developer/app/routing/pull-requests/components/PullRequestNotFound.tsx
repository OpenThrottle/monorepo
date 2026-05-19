import * as React from 'react';
import classnames from 'classnames';
import { Link } from 'react-router';
import { Button } from '@openthrottle/react-router-shadcn';
import { OpenThrottleEmptyState } from '@openthrottle/react-router-ui';

interface PullRequestNotFoundProps {
  readonly className?: string;
  readonly listQuery: string;
  readonly owner: string;
  readonly repo: string;
}

export const PullRequestNotFound = (props: PullRequestNotFoundProps) => {
  const { className, listQuery, owner, repo } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div
      className={classnames('p-4', className)}
      data-testid="PullRequestNotFound"
    >
      <OpenThrottleEmptyState
        description="This PR was not found for the selected owner and repo. Try another filter from the list or open the repository on GitHub."
        title="Pull request not found"
      />
      <div className="mt-4 flex flex-wrap gap-2">
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
        <Button asChild={true} size="sm" variant="outline">
          <a
            href={`https://github.com/${owner}/${repo}`}
            rel="noopener noreferrer"
            target="_blank"
          >
            Open repo on GitHub
          </a>
        </Button>
      </div>
    </div>
  );
};
