import * as React from 'react';
import { AGENT_SEARCH_COPY } from '~/routing/agent-search/data/data.copy';

/**
 * @description Empty-state shown when a query returns no agent-asset matches.
 */
export const AgentSearchEmpty = (): React.ReactElement => {
  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div
      className="text-muted-foreground space-y-1 p-8 text-center"
      data-testid="AgentSearchEmpty"
    >
      <p className="text-foreground text-base font-medium">
        {AGENT_SEARCH_COPY.emptyHeading}
      </p>
      <p className="text-sm">{AGENT_SEARCH_COPY.emptyMessage}</p>
    </div>
  );
};
