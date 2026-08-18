import * as React from 'react';
import {
  DRIVER_MCP_WARNING,
  resolveDriverMcpReachability,
} from '~/routing/schedule/data/data.driver-mcp';
import type { DriverMcpOption } from '~/routing/schedule/data/data.driver-mcp';

export interface ScheduleMcpWarningProps {
  /** Available agent CLIs from discovery; undefined when discovery could not be loaded. */
  agentClis?: readonly DriverMcpOption[];
  /** Currently selected driver id. */
  driverId: string;
}

/**
 * @description Advisory note shown when the selected provider cannot reach the workspace's MCP
 * servers, or when that cannot be verified. Never blocks submission — a prompt that needs no MCP
 * tools is valid on any provider.
 */
export const ScheduleMcpWarning = (
  props: ScheduleMcpWarningProps,
): React.ReactElement | null => {
  const { agentClis, driverId } = props;

  // Hooks

  // Setup
  const reachability = resolveDriverMcpReachability(driverId, agentClis);
  const warning = DRIVER_MCP_WARNING[reachability];

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit
  if (warning === null) {
    return null;
  }

  return (
    <div
      className="mt-2 rounded-md border border-amber-500/50 bg-amber-500/10 p-3"
      data-testid="ScheduleMcpWarning"
      role="status"
    >
      <p className="text-sm font-medium">{warning.title}</p>
      <p className="text-muted-foreground mt-1 text-sm">{warning.body}</p>
    </div>
  );
};
