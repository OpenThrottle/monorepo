import type { PullRequestCardFragment } from '@openthrottle/openthrottle-developer-codegen';
import { Button } from '@openthrottle/react-router-shadcn';
import { formatDate } from 'date-fns';
import { GitPullRequestIcon } from 'lucide-react';
import * as React from 'react';
import { Link } from 'react-router';

import { PullRequestStatus } from '~/routing/pull-requests/components/PullRequestStatus';
import type { PullRequestsListFilters } from '~/routing/pull-requests/types/pull-requests-list-filters';
import {
  githubPullChecksUrl,
  githubPullConversationUrl,
} from '~/routing/pull-requests/utils/github-pr-links';

export interface PullRequestPreviewDetailsProps {
  filters: PullRequestsListFilters;
  fullPagePath: string;
  pull: PullRequestCardFragment;
}

/**
 * @description Body of the pull request preview sheet for a PR that is in the
 * current filtered list: status, title, dates, branches and quick links.
 */
export const PullRequestPreviewDetails = (
  props: PullRequestPreviewDetailsProps,
): React.ReactElement => {
  const { filters, fullPagePath, pull } = props;

  // Hooks

  // Setup
  const hasBranches = pull.baseRef !== null || pull.headRef !== null;
  const baseRefLabel = pull.baseRef !== null ? pull.baseRef : '—';
  const headRefLabel = pull.headRef !== null ? pull.headRef : '—';

  // Handlers

  // Markup
  const branches = (
    <p className="text-muted-foreground font-mono text-xs">
      {baseRefLabel} ← {headRefLabel}
    </p>
  );

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div
      className="flex flex-col gap-4"
      data-testid="PullRequestPreviewSheet-body"
    >
      <div className="flex flex-wrap items-center gap-2">
        <PullRequestStatus state={pull.state} />
        <span className="text-muted-foreground text-sm">#{pull.number}</span>
      </div>
      <h3 className="text-lg leading-snug">{pull.title}</h3>
      <p className="text-muted-foreground text-sm">
        <span className="text-foreground font-medium">{pull.author}</span> ·
        Created {formatDate(pull.createdAt, 'MM/dd/yyyy')} — updated{' '}
        {formatDate(pull.updatedAt, 'MM/dd/yyyy')}
      </p>
      {hasBranches ? branches : null}

      <div className="flex flex-wrap gap-2">
        <Button asChild={true} size="sm" variant="default">
          <Link to={fullPagePath} viewTransition={true}>
            Open full page
          </Link>
        </Button>
        <Button asChild={true} size="sm" variant="outline">
          <a
            href={githubPullConversationUrl(
              filters.owner,
              filters.repo,
              pull.number,
            )}
            rel="noopener noreferrer"
            target="_blank"
          >
            <GitPullRequestIcon className="mr-1 inline size-4" />
            GitHub
          </a>
        </Button>
        <Button asChild={true} size="sm" variant="secondary">
          <a
            href={githubPullChecksUrl(filters.owner, filters.repo, pull.number)}
            rel="noopener noreferrer"
            target="_blank"
          >
            Checks (CI)
          </a>
        </Button>
      </div>
    </div>
  );
};
