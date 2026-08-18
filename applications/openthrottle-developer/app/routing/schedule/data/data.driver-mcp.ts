/**
 * @description Copy and lookup for the schedule form's workspace-MCP warning. A job pairing an
 * MCP-dependent prompt with a driver that cannot reach `openthrottle-mcp` fails the same silent way
 * the run-outcome work addressed — it just fails at author time instead of at 3am.
 *
 * Three states, deliberately distinguished. `false` is a definite negative (the CLI reads only its
 * own user-scope config, so no workspace file can grant it access), while a driver missing from
 * discovery is UNKNOWN — discovery only returns CLIs installed on the server host, so absence means
 * "not installed or not reported", never "known good". Claiming a definite negative for an unknown
 * would be the same overreach as the green run this plan started from.
 */

/** Reachability of the workspace's MCP servers for one driver, as far as the server can tell. */
export const DRIVER_MCP_REACHABILITY = {
  /** The CLI resolves the workspace's committed MCP config. */
  attaches: 'attaches',
  /** The CLI reads only its own user-scope config; no workspace file can grant access. */
  cannotAttach: 'cannot-attach',
  /** Not reported by discovery — not installed on the host, or discovery is unavailable. */
  unknown: 'unknown',
} as const;

/** One of the {@link DRIVER_MCP_REACHABILITY} values. */
export type DriverMcpReachability =
  (typeof DRIVER_MCP_REACHABILITY)[keyof typeof DRIVER_MCP_REACHABILITY];

/** Minimal shape this module needs from the `ScheduleFormAgentClis` query. */
export interface DriverMcpOption {
  readonly attachesWorkspaceMcp: boolean;
  readonly backend: string;
}

/**
 * @description Resolves a driver id to its reachability. Returns `unknown` when the driver is absent
 * from the discovery list, which is the honest answer rather than a guess in either direction.
 */
export const resolveDriverMcpReachability = (
  driverId: string,
  agents: readonly DriverMcpOption[] | undefined,
): DriverMcpReachability => {
  const match = agents?.find((agent) => agent.backend === driverId);
  if (match === undefined) {
    return DRIVER_MCP_REACHABILITY.unknown;
  }

  return match.attachesWorkspaceMcp
    ? DRIVER_MCP_REACHABILITY.attaches
    : DRIVER_MCP_REACHABILITY.cannotAttach;
};

/**
 * @description Warning copy per reachability state, or null when there is nothing to say. Advisory
 * only — the form never blocks on this, because a prompt that needs no MCP tools is perfectly valid
 * on any driver.
 */
export const DRIVER_MCP_WARNING: Record<
  DriverMcpReachability,
  { body: string; title: string } | null
> = {
  [DRIVER_MCP_REACHABILITY.attaches]: null,
  [DRIVER_MCP_REACHABILITY.cannotAttach]: {
    body: `This CLI reads MCP servers only from its own user-level config, never from the repo, so nothing in this checkout can give it openthrottle-mcp. A prompt that files plans or tasks will run, exit cleanly, and do nothing. Pick claude, cursor, or opencode for MCP-dependent work — or register the server in that CLI's own config on the server host.`,
    title: `This provider cannot reach the workspace's MCP servers`,
  },
  [DRIVER_MCP_REACHABILITY.unknown]: {
    body: `This provider was not reported by agent discovery, so its MCP access cannot be verified — it may not be installed on the server host. If your prompt depends on openthrottle-mcp, confirm the CLI is installed before relying on this schedule.`,
    title: `MCP access for this provider could not be verified`,
  },
};
