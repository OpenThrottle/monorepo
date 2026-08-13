/**
 * @description Display catalog for the finite set of agent CLIs surfaced on /settings/setup, plus a
 * pure helper that merges it with the server's `discoverAgentClis` result (which returns only the
 * AVAILABLE CLIs) into a per-CLI installed/not-installed status list.
 *
 * CANONICAL SOURCE: the `@openthrottle/openthrottle-drivers` registry (ALL_DRIVERS) and
 * scripts/setup_software.sh own the real allowlist + install URLs. That package can't be imported
 * into the browser bundle (it pulls node-only modules), so this is a thin cosmetic mirror — labels
 * and doc links only. The install/update ACTIONS send just a backend id the server re-validates
 * against the registry, so nothing security-relevant is duplicated here. Keep this list in sync with
 * the registry (see the drift reconciliation in the plan's setup_software.sh task).
 */

/** One agent CLI the setup page can display, keyed by the driver-id backend discriminator. */
interface AgentCliCatalogEntry {
  /** Driver id / backend discriminator (matches discoverAgentClis `backend`). */
  readonly backend: string;
  /** Installer URL (shown as a reference link; the actual install runs server-side). */
  readonly installUrl: string;
  /** Human-friendly display label. */
  readonly label: string;
}

/** The finite allowlist, mirrored from the drivers registry (display only). */
const AGENT_CLI_CATALOG: readonly AgentCliCatalogEntry[] = [
  {
    backend: 'claude',
    installUrl: 'https://claude.ai/install.sh',
    label: 'Claude Code',
  },
  {
    backend: 'codex',
    installUrl: 'https://chatgpt.com/codex/install.sh',
    label: 'Codex',
  },
  {
    backend: 'cursor',
    installUrl: 'https://cursor.com/install',
    label: 'Cursor Agent',
  },
  { backend: 'grok', installUrl: 'https://x.ai/cli/install.sh', label: 'Grok' },
  {
    backend: 'opencode',
    installUrl: 'https://opencode.ai/install',
    label: 'OpenCode',
  },
];

/** One model of an agent CLI with the current user's per-model preferences. */
export interface AgentCliModelStatus {
  /** Effective per-user enablement (agent-OFF already folded in server-side). */
  readonly enabled: boolean;
  /** Whether the user favorited this model. */
  readonly favorite: boolean;
  readonly model: string;
}

/** One available (installed) CLI as returned by the discoverAgentClis query. */
export interface AvailableAgentCli {
  readonly backend: string;
  /** Per-user enablement (false = the user disabled this agent). */
  readonly enabled: boolean;
  readonly label: string;
  /** Per-model enabled + favorite state (supersedes the deprecated flat models list). */
  readonly modelOptions: readonly AgentCliModelStatus[];
  readonly version?: string | null;
}

/** Per-CLI merged status for the setup table. */
export interface AgentCliStatus {
  readonly backend: string;
  /**
   * Per-user enablement. Only an installed (available) CLI carries the server's value; a
   * not-installed catalog entry defaults to enabled (there is nothing to disable yet).
   */
  readonly enabled: boolean;
  readonly installUrl: string;
  readonly installed: boolean;
  readonly label: string;
  /** Per-model enabled + favorite state, in discovery order. Empty when the CLI lists no models. */
  readonly modelOptions: readonly AgentCliModelStatus[];
  /** Flat model-id list derived from {@link modelOptions}, for compact summaries. */
  readonly models: readonly string[];
  readonly version: string | null;
}

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

  return AGENT_CLI_CATALOG.map((entry) => {
    const agent = byBackend.get(entry.backend);
    const modelOptions = agent?.modelOptions ?? [];
    return {
      backend: entry.backend,
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

/** Toolbar filter for the setup table: all rows, only enabled, or only installed. */
export const AGENT_CLI_FILTERS = ['all', 'enabled', 'installed'] as const;

/** One of the {@link AGENT_CLI_FILTERS} values. */
export type AgentCliFilter = (typeof AGENT_CLI_FILTERS)[number];

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
