/**
 * @description Display catalog for the finite set of agent CLIs surfaced on /settings/agents, plus a
 * pure helper that merges it with the server's `discoverAgentClis` result (which returns only the
 * AVAILABLE CLIs) into a per-CLI installed/not-installed status list.
 *
 * `@openthrottle/openthrottle-drivers` cannot be imported into the browser bundle (node-only
 * modules), so {@link AGENT_CLI_BACKENDS} is a browser-safe mirror of the driver ids. The catalog
 * is `Record<AgentCliBackend, …>` so a backend cannot exist without a label and an install link.
 * `__tests__/agent-cli-registry-parity.test.ts` holds that mirror to `ALL_DRIVERS` at test time
 * (tests run in node).
 */

export const AGENT_CLI_BACKENDS = {
  antigravity: 'antigravity',
  claude: 'claude',
  codex: 'codex',
  cursor: 'cursor',
  gemini: 'gemini',
  grok: 'grok',
  opencode: 'opencode',
} as const;

/** A backend id the setup page can display. */
export type AgentCliBackend =
  (typeof AGENT_CLI_BACKENDS)[keyof typeof AGENT_CLI_BACKENDS];

/** One agent CLI the setup page can display, keyed by the driver-id backend discriminator. */
interface AgentCliCatalogEntry {
  /**
   * Installer URL (shown as a reference link; the actual install runs server-side). Matches the
   * driver's own `install.url`, except `gemini`, which installs via npm and has no install script
   * — geminicli.com is a docs page, and the parity test encodes that exception explicitly.
   */
  readonly installUrl: string;
  /**
   * Human-friendly display label. Genuinely local, NOT a duplicate of the driver's `label`: the
   * driver's is the binary-ish name (`claude-code`, `cursor-agent`) and this is the product name.
   */
  readonly label: string;
}

/**
 * Display metadata per backend. Exhaustive over {@link AgentCliBackend}: a backend cannot be
 * listed without a label and an install link.
 */
const AGENT_CLI_CATALOG: Record<AgentCliBackend, AgentCliCatalogEntry> = {
  antigravity: {
    installUrl: 'https://antigravity.google/cli/install.sh',
    label: 'Antigravity',
  },
  claude: {
    installUrl: 'https://claude.ai/install.sh',
    label: 'Claude Code',
  },
  codex: {
    installUrl: 'https://chatgpt.com/codex/install.sh',
    label: 'Codex',
  },
  cursor: {
    installUrl: 'https://cursor.com/install',
    label: 'Cursor Agent',
  },
  gemini: {
    installUrl: 'https://geminicli.com',
    label: 'Gemini CLI',
  },
  grok: {
    installUrl: 'https://x.ai/cli/install.sh',
    label: 'Grok',
  },
  opencode: {
    installUrl: 'https://opencode.ai/install',
    label: 'OpenCode',
  },
};

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
