import { cn } from '@openthrottle/react-router-shadcn';
import * as React from 'react';

import {
  MCP_CONNECTOR_FALLBACK_ICON,
  MCP_CONNECTOR_ICON,
} from '~/routing/settings/data/mcp-connector-icons';

export interface SettingsMcpConnectorIconProps {
  readonly className?: string;
  readonly iconHint: string;
}

export const SettingsMcpConnectorIcon = (
  props: SettingsMcpConnectorIconProps,
): React.ReactElement => {
  const { className, iconHint } = props;

  // Hooks

  // Setup
  const Icon = MCP_CONNECTOR_ICON[iconHint] ?? MCP_CONNECTOR_FALLBACK_ICON;

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <span
      aria-hidden={true}
      className={cn(
        'bg-muted text-muted-foreground flex size-8 shrink-0 items-center justify-center rounded-md border',
        className,
      )}
      data-testid="SettingsMcpConnectorIcon"
    >
      <Icon className="size-4" />
    </span>
  );
};
