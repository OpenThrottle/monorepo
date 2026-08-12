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

/** One available (installed) CLI as returned by the discoverAgentClis query. */
export interface AvailableAgentCli {
  readonly backend: string;
  readonly label: string;
  readonly models: readonly string[];
  readonly version?: string | null;
}

/** Per-CLI merged status for the setup cards. */
export interface AgentCliStatus {
  readonly backend: string;
  readonly installUrl: string;
  readonly installed: boolean;
  readonly label: string;
  readonly models: readonly string[];
  readonly version: string | null;
}

/**
 * Merge the display catalog with the available (installed) CLIs from discoverAgentClis into one
 * status row per catalog entry, ordered by the catalog. An installed CLI carries its probed version
 * + models; an absent one is marked `installed: false`.
 */
export const mergeAgentCliStatuses = (
  available: readonly AvailableAgentCli[],
): readonly AgentCliStatus[] => {
  const byBackend = new Map(available.map((agent) => [agent.backend, agent]));

  return AGENT_CLI_CATALOG.map((entry) => {
    const agent = byBackend.get(entry.backend);
    return {
      backend: entry.backend,
      installUrl: entry.installUrl,
      installed: agent !== undefined,
      label: entry.label,
      models: agent?.models ?? [],
      version: agent?.version ?? null,
    };
  });
};
