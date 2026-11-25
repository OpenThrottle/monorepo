import { Button, Switch } from '@openthrottle/react-router-shadcn';
import { ChevronDownIcon, ChevronUpIcon } from 'lucide-react';
import * as React from 'react';
import { Link, useFetcher } from 'react-router';

import type {
  McpConnectorConnectionFieldsFragment,
  McpConnectorFieldsFragment,
} from '~/__generated__/graphql';
import { MCP_CATALOG_COPY } from '~/routing/settings/data/mcp-connectors';
import type { SettingsMcpActionData } from '~/routing/settings/utils/settings-mcp-action';
import { getConnectionSummary } from '~/routing/settings/utils/settings-mcp-connection';

import { SettingsMcpConnectorIcon } from './SettingsMcpConnectorIcon';
import { SettingsMcpManagePanel } from './SettingsMcpManagePanel';

export interface SettingsMcpConnectedRowProps {
  readonly connection: McpConnectorConnectionFieldsFragment;
  readonly connector: McpConnectorFieldsFragment;
  readonly isOpen: boolean;
}

export const SettingsMcpConnectedRow = (
  props: SettingsMcpConnectedRowProps,
): React.ReactElement => {
  const { connection, connector, isOpen } = props;

  // Hooks
  const fetcher = useFetcher<SettingsMcpActionData>();

  // Setup
  const pendingEnabled = fetcher.formData?.get('enabled');
  const hasPendingEnabled = typeof pendingEnabled === 'string';
  const isEnabled = hasPendingEnabled
    ? pendingEnabled === 'true'
    : connection.enabled;
  const summary = getConnectionSummary({ ...connection, enabled: isEnabled });
  const toggleTo = isOpen ? '?' : `?manage=${connector.key}`;
  const ToggleIcon = isOpen ? ChevronUpIcon : ChevronDownIcon;

  // Handlers
  const handleEnabledChange = (checked: boolean): void => {
    void fetcher.submit(
      {
        connectorKey: connector.key,
        enabled: String(checked),
        intent: 'setEnabled',
      },
      { action: `/settings/mcp/${connector.key}`, method: 'post' },
    );
  };

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <li
      className="bg-card rounded-lg border"
      data-state={isOpen ? 'open' : 'closed'}
      data-testid="SettingsMcpConnectedRow"
    >
      <div className="flex items-center gap-3 px-4 py-3">
        <SettingsMcpConnectorIcon iconHint={connector.iconHint} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{connector.name}</p>
          <p
            className="text-muted-foreground truncate text-xs"
            data-testid="SettingsMcpConnectedRow-summary"
          >
            {summary}
          </p>
        </div>
        <Switch
          aria-label={`Enable ${connector.name}`}
          checked={isEnabled}
          data-testid="SettingsMcpConnectedRow-enabled"
          onCheckedChange={handleEnabledChange}
          size="sm"
        />
        <Button asChild={true} size="sm" variant="outline">
          <Link
            aria-expanded={isOpen}
            data-testid="SettingsMcpConnectedRow-manage"
            preventScrollReset={true}
            replace={true}
            to={toggleTo}
          >
            {isOpen ? MCP_CATALOG_COPY.close : MCP_CATALOG_COPY.manage}
            <ToggleIcon />
          </Link>
        </Button>
      </div>
      {isOpen ? (
        <SettingsMcpManagePanel connection={connection} connector={connector} />
      ) : null}
    </li>
  );
};
