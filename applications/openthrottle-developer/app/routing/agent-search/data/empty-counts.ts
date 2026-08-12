import type { AgentSearchCounts } from '~/routing/agent-search/types';

/** Zeroed per-tab counts for an empty/unsubmitted agent search. */
export const EMPTY_COUNTS: AgentSearchCounts = {
  all: 0,
  personas: 0,
  rules: 0,
  skills: 0,
};
