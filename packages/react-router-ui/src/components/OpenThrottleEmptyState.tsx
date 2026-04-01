import * as React from 'react';
import classnames from 'classnames';

export interface OpenThrottleEmptyStateProps {
  readonly className?: string;
}

export const OpenThrottleEmptyState = (props: OpenThrottleEmptyStateProps) => {
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
      data-testid="OpenThrottleEmptyState"
    >
      <h2>OpenThrottle Empty State</h2>
    </div>
  );
};
