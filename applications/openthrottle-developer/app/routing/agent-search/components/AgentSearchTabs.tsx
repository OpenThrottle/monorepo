import * as React from 'react';
import { useSearchParams } from 'react-router';
import { Tabs, TabsList, TabsTrigger } from '@openthrottle/react-router-shadcn';
import {
  AGENT_SEARCH_TABS,
  type AgentSearchCounts,
  type AgentSearchTab,
} from '~/routing/agent-search/types';
import { AGENT_SEARCH_TAB_LABEL } from '~/routing/agent-search/data/agent-search-tabs';

export interface AgentSearchTabsProps {
  counts: AgentSearchCounts;
  tab: AgentSearchTab;
}

/**
 * @description Prompt-type tabs (all | skills | rules | personas) wired to the `type` URL param.
 * Selecting a tab updates the URL (re-running the loader); labels show per-tab result counts.
 */
export const AgentSearchTabs = (
  props: AgentSearchTabsProps,
): React.ReactElement => {
  const { counts, tab } = props;

  // Hooks
  const [searchParams, setSearchParams] = useSearchParams();

  // Setup

  // Handlers
  const handleValueChange = (value: string): void => {
    const next = new URLSearchParams(searchParams);
    if (value === 'all') {
      next.delete('type');
    } else {
      next.set('type', value);
    }
    setSearchParams(next, { replace: true });
  };

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <Tabs
      data-testid="AgentSearchTabs"
      onValueChange={handleValueChange}
      value={tab}
    >
      <TabsList>
        {AGENT_SEARCH_TABS.map((value) => (
          <TabsTrigger key={value} value={value}>
            {AGENT_SEARCH_TAB_LABEL[value]} ({counts[value]})
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
};
