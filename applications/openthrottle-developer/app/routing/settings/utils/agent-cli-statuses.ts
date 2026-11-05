import type {
  AgentCliAuthSource,
  AgentCliAuthWarning,
  AgentCliFilter,
  AgentCliStatus,
  AvailableAgentCli,
} from '~/routing/settings/data/data.agent-clis';
import {
  AGENT_CLI_BACKENDS,
  AGENT_CLI_CATALOG,
} from '~/routing/settings/data/data.agent-clis';

/**
 * Merge the display catalog with the available (installed) CLIs from discoverAgentClis into one
 * status row per catalog entry, ordered by the catalog. An installed CLI carries its probed version
 * + per-model options (enabled + favorite) + per-user `enabled`; an absent one is marked
 * `installed: false` and defaults to enabled with no models.
 */
export const mergeAgentCliStatuses = (
  available: readonly AvailableAgentCli[],
): readonly AgentCliStatus[] => {
  const byBackend = new Map(available.map((agent) => [agent.backend, agent]));

  return Object.values(AGENT_CLI_BACKENDS).map((backend) => {
    const entry = AGENT_CLI_CATALOG[backend];
    const agent = byBackend.get(backend);
    const modelOptions = agent?.modelOptions ?? [];

    return {
      backend,
      enabled: agent?.enabled ?? true,
      installUrl: entry.installUrl,
      installed: agent !== undefined,
      label: entry.label,
      modelOptions,
      models: modelOptions.map((option) => option.model),
      version: agent?.version ?? null,
    };
  });
};

/**
 * Narrow the merged status list to the active toolbar filter. `all` passes everything; `installed`
 * keeps detected CLIs; `enabled` keeps the ones the user has not disabled. Pure — the route owns the
 * filter state and applies this before handing rows to the table.
 */
export const filterAgentCliStatuses = (
  statuses: readonly AgentCliStatus[],
  filter: AgentCliFilter,
): readonly AgentCliStatus[] => {
  switch (filter) {
    case 'enabled':
      return statuses.filter((status) => status.enabled);
    case 'installed':
      return statuses.filter((status) => status.installed);
    default:
      return statuses;
  }
};

/**
 * Collect the loud credential warnings (e.g. an API key overriding the subscription) from the
 * discovered agents, in discovery order. Agents without an auth report or warning contribute nothing.
 */
export const collectAgentCliAuthWarnings = (
  agents: readonly AgentCliAuthSource[],
): readonly AgentCliAuthWarning[] => {
  const warnings: AgentCliAuthWarning[] = [];

  for (const agent of agents) {
    const warning = agent.auth?.warning;
    const hasWarning = typeof warning === 'string' && warning !== '';

    if (hasWarning) {
      warnings.push({ backend: agent.backend, label: agent.label, warning });
    }
  }

  return warnings;
};
