import * as React from 'react';
import classnames from 'classnames';

export interface PullRequestDetailsProps {
  readonly className?: string;
}

export const PullRequestDetails = (props: PullRequestDetailsProps) => {
  const { className } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div
      className={classnames('p-4', className)}
      data-testid="PullRequestDetails"
    >
      <h2>PullRequestDetails</h2>
    </div>
  );
};
