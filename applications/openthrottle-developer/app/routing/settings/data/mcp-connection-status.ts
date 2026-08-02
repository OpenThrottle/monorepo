/**
 * @description Presentation mapping for MCP connector status badges (color + label).
 */

import type { BadgeProps } from '@openthrottle/react-router-shadcn';
import type { McpConnectorStatus } from '~/routing/settings/utils/settings-mcp-connection';

export const MCP_CONNECTION_STATUS_DISPLAY: Record<
  McpConnectorStatus,
  { color: BadgeProps['color']; label: string }
> = {
  disabled: { color: 'amber', label: 'Disabled' },
  disconnected: { color: 'slate', label: 'Not connected' },
  enabled: { color: 'green', label: 'Connected' },
};
