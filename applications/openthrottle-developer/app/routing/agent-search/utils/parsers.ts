/**
 * @description Parses `/agent-search` URL params into typed query, tab, and project scope.
 */

import {
  AGENT_SEARCH_TABS,
  type AgentSearchTab,
} from '~/routing/agent-search/types';

/** Parsed agent-search URL parameters. */
export interface ParsedAgentSearchParams {
  readonly projectId: string | null;
  readonly q: string;
  readonly tab: AgentSearchTab;
}

const isAgentSearchTab = (value: string): value is AgentSearchTab =>
  AGENT_SEARCH_TABS.some((tab) => tab === value);

/**
 * @description Parses URL search params into typed q, tab (`type`), and projectId.
 * Unknown/missing `type` falls back to `all`.
 */
export function parseAgentSearchParams(
  searchParams: URLSearchParams,
): ParsedAgentSearchParams {
  const q = searchParams.get('q') ?? '';
  const tabRaw = searchParams.get('type') ?? 'all';
  const tab = isAgentSearchTab(tabRaw) ? tabRaw : 'all';
  const projectIdRaw = searchParams.get('projectId')?.trim() ?? '';
  const projectId = projectIdRaw.length > 0 ? projectIdRaw : null;

  return { projectId, q, tab };
}
