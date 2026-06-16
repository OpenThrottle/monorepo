import * as React from 'react';
import { AGENT_SEARCH_COPY } from '~/routing/agent-search/data/data.copy';

/**
 * @description Heading + blurb for the agent-assets search route.
 */
export const AgentSearchIntroduction = (): React.ReactElement => {
  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div className="space-y-1 p-4" data-testid="AgentSearchIntroduction">
      <h1 className="text-2xl font-semibold tracking-tight">
        {AGENT_SEARCH_COPY.introHeading}
      </h1>
      <p className="text-muted-foreground text-sm">
        {AGENT_SEARCH_COPY.introBody}
      </p>
    </div>
  );
};
