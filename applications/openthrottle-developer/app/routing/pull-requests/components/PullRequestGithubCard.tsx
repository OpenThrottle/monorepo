import * as React from 'react';
import { Card } from '@openthrottle/react-router-shadcn';
import { PullRequestActionsLinks } from '~/routing/pull-requests/components/PullRequestActionsLinks';
import { PullRequestChecksLinks } from '~/routing/pull-requests/components/PullRequestChecksLinks';
import { PullRequestDiffLinks } from '~/routing/pull-requests/components/PullRequestDiffLinks';
import type { PullRequestDetailFragment } from '~/__generated__/graphql';

export interface PullRequestGithubCardProps {
  owner: string;
  pull: PullRequestDetailFragment;
  repo: string;
}

export const PullRequestGithubCard = (
  props: PullRequestGithubCardProps,
): React.ReactElement => {
  const { owner, pull, repo } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <Card className="p-4 lg:p-6">
      <h2 className="text-muted-foreground mb-3 text-sm font-semibold tracking-wide uppercase">
        Merge &amp; CI on GitHub
      </h2>
      <p className="text-muted-foreground mb-4 text-sm">
        CI conclusions are not mirrored here; use the links below to drill into
        GitHub Checks (rollup + required rules), per-commit status at the head
        SHA when available, Actions runs scoped to this PR or branch, and
        workflow sources.
      </p>

      <PullRequestChecksLinks owner={owner} pull={pull} repo={repo} />
      <PullRequestActionsLinks owner={owner} pull={pull} repo={repo} />
      <PullRequestDiffLinks owner={owner} pull={pull} repo={repo} />

      <ol className="text-muted-foreground list-decimal space-y-2 pl-5 text-sm">
        <li>
          Open <span className="text-foreground font-medium">Checks</span> for
          required rules and the aggregated conclusion.
        </li>
        <li>
          Use <span className="text-foreground font-medium">Commits</span> or{' '}
          <span className="text-foreground font-medium">
            Checks at head SHA
          </span>{' '}
          when one SHA failed and you need that job log.
        </li>
        <li>
          Prefer{' '}
          <span className="text-foreground font-medium">
            refs/pull/{pull.number}/merge
          </span>{' '}
          Actions when debugging merge-result CI; use{' '}
          <span className="text-foreground font-medium">
            refs/pull/{pull.number}/head
          </span>{' '}
          or <span className="text-foreground font-medium">branch name</span>{' '}
          for contributor-branch workflows.
        </li>
        <li>
          Confirm YAML under{' '}
          <span className="text-foreground font-medium">.github/workflows</span>{' '}
          if triggers or paths look wrong.
        </li>
      </ol>
    </Card>
  );
};
