import * as React from 'react';
import { Badge } from '@openthrottle/react-router-shadcn';
import type { BadgeProps } from '@openthrottle/react-router-shadcn';
import type { McpConnectorStatus } from '~/routing/settings/utils/settings-mcp-connection';

export interface SettingsMcpConnectionStatusBadgeProps {
  className?: string;
  status: McpConnectorStatus;
}

const STATUS_DISPLAY: Record<
  McpConnectorStatus,
  { color: BadgeProps['color']; label: string }
> = {
  disabled: { color: 'amber', label: 'Disabled' },
  disconnected: { color: 'slate', label: 'Not connected' },
  enabled: { color: 'green', label: 'Connected' },
};

export const SettingsMcpConnectionStatusBadge = (
  props: SettingsMcpConnectionStatusBadgeProps,
): React.ReactElement => {
  const { className, status } = props;

  // Hooks

  // Setup
  const display = STATUS_DISPLAY[status];

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
