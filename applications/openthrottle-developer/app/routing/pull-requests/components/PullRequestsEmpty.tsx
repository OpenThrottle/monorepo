import * as React from 'react';
import classnames from 'classnames';

export interface PullRequestsEmptyProps {
  readonly className?: string;
}

export const PullRequestsEmpty = (props: PullRequestsEmptyProps) => {
  const { className } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <p className={classnames('text-muted-foreground mt-8 text-sm', className)}>
      No pull requests match these filters. Try another repo or clear the author
      filter.
    </p>
  );
};
