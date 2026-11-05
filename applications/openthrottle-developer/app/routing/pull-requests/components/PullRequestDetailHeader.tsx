import { formatDate } from 'date-fns';
import * as React from 'react';

import type { PullRequestDetailFragment } from '~/__generated__/graphql';

export interface PullRequestDetailHeaderProps {
  pull: PullRequestDetailFragment;
}

export const PullRequestDetailHeader = (
  props: PullRequestDetailHeaderProps,
): React.ReactElement => {
  const { pull } = props;

  // Hooks

  // Setup
  const hasBranches = pull.baseRef !== null || pull.headRef !== null;
  const baseRefLabel = pull.baseRef !== null ? pull.baseRef : '—';
  const headRefLabel = pull.headRef !== null ? pull.headRef : '—';

  // Handlers

  // Markup
  const branches = (
    <p className="text-muted-foreground mt-2 font-mono text-sm">
      Branches: <span className="text-foreground">{baseRefLabel}</span> ←{' '}
      <span className="text-foreground">{headRefLabel}</span>
    </p>
  );

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div className="mb-6">
      <h1 className="text-accent text-xl leading-snug font-semibold">
        {pull.title}{' '}
        <span className="text-muted-foreground font-normal">
          #{pull.number}
        </span>
      </h1>
      <p className="text-muted-foreground mt-2 text-sm">
        <span className="text-foreground font-medium">{pull.author}</span>
        {' · '}
        State {pull.state} · Created {formatDate(pull.createdAt, 'MM/dd/yyyy')}{' '}
        — updated {formatDate(pull.updatedAt, 'MM/dd/yyyy')}
        {pull.mergedAt && (
          <> · Merged {formatDate(pull.mergedAt, 'MM/dd/yyyy')}</>
        )}
      </p>
      {hasBranches ? branches : null}
    </div>
  );
};
