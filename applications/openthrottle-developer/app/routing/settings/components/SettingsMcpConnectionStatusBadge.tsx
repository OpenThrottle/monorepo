import * as React from 'react';
import { Badge } from '@openthrottle/react-router-shadcn';
import type { McpConnectorStatus } from '~/routing/settings/utils/settings-mcp-connection';
import { MCP_CONNECTION_STATUS_DISPLAY } from '~/routing/settings/data/mcp-connection-status';

export interface SettingsMcpConnectionStatusBadgeProps {
  className?: string;
  status: McpConnectorStatus;
}

export const SettingsMcpConnectionStatusBadge = (
  props: SettingsMcpConnectionStatusBadgeProps,
): React.ReactElement => {
  const { className, status } = props;

  // Hooks

  // Setup
  const display = MCP_CONNECTION_STATUS_DISPLAY[status];

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <Badge
      className={className}
      color={display.color}
      data-testid="SettingsMcpConnectionStatusBadge"
    >
      {display.label}
    </Badge>
  );
};
