import * as React from 'react';
import { OpenThrottleEmptyState } from '@openthrottle/react-router-ui';
import { GITHUB_STATS_TOKEN_EMPTY_STATE_COPY } from '~/routing/dashboard/data/data.copy';

export interface DashboardGithubTokenEmptyStateProps {
  className?: string;
}

/**
 * @description Empty state for the dashboard GitHub-stats cards, rendered when
 * the server has no `GITHUB_TOKEN` configured. Instead of showing zeroed /
 * unauthenticated charts with no explanation, it prompts the user to set
 * GITHUB_TOKEN. Copy lives in data.copy.ts.
 */
export const DashboardGithubTokenEmptyState = (
  props: DashboardGithubTokenEmptyStateProps,
): React.ReactElement => {
  const { className } = props;

  // Hooks

  // Setup
  const copy = GITHUB_STATS_TOKEN_EMPTY_STATE_COPY;

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <OpenThrottleEmptyState
      className={className}
      description={copy.description}
      title={copy.title}
    />
  );
};
