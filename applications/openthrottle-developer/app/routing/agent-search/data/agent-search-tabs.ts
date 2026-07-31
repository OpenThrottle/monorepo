import type { AgentSearchTab } from '~/routing/agent-search/types';

/** Display label per agent-search prompt-type tab. */
export const AGENT_SEARCH_TAB_LABEL: Readonly<Record<AgentSearchTab, string>> =
  {
    all: 'All',
    personas: 'Personas',
    rules: 'Rules',
    skills: 'Skills',
  };
