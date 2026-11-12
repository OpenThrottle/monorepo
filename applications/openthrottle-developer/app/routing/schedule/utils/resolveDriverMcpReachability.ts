import type {
  DriverMcpOption,
  DriverMcpReachability,
} from '~/routing/schedule/data/data.driver-mcp';
import { DRIVER_MCP_REACHABILITY } from '~/routing/schedule/data/data.driver-mcp';

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
