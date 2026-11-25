import {
  Button,
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@openthrottle/react-router-shadcn';
import { ExternalLinkIcon, PlusIcon } from 'lucide-react';
import * as React from 'react';
import { Link, useFetcher } from 'react-router';

import type { McpConnectorFieldsFragment } from '~/__generated__/graphql';
import {
  MCP_AUTH_TYPE_LABEL,
  MCP_CATALOG_COPY,
  MCP_TRANSPORT_LABEL,
} from '~/routing/settings/data/mcp-connectors';
import type { SettingsMcpActionData } from '~/routing/settings/utils/settings-mcp-action';
import { getProviderLabel } from '~/routing/settings/utils/settings-mcp-connection';

import { SettingsMcpConnectorIcon } from './SettingsMcpConnectorIcon';

export interface SettingsMcpAvailableChipProps {
  readonly connector: McpConnectorFieldsFragment;
}

export const SettingsMcpAvailableChip = (
  props: SettingsMcpAvailableChipProps,
): React.ReactElement => {
  const { connector } = props;

  // Hooks
  const fetcher = useFetcher<SettingsMcpActionData>();

  // Setup
  const isApiToken = connector.authType === 'api_token';
  const facts = [
    connector.category,
    MCP_AUTH_TYPE_LABEL[connector.authType] ?? connector.authType,
    MCP_TRANSPORT_LABEL[connector.transport] ?? connector.transport,
  ];
  const actionError =
    fetcher.data && 'error' in fetcher.data ? fetcher.data.error : null;
  const isConnecting = fetcher.state !== 'idle';

  // Handlers

  // Markup
  const tokenAction = (
    <Button asChild={true} size="sm">
      <Link
        data-testid="SettingsMcpAvailableChip-connect"
        to={`/settings/mcp/${connector.key}`}
      >
        {MCP_CATALOG_COPY.addToken}
      </Link>
    </Button>
  );
  const oauthAction = (
    <fetcher.Form action={`/settings/mcp/${connector.key}`} method="post">
      <input name="intent" type="hidden" value="connect" />
      <input name="connectorKey" type="hidden" value={connector.key} />
      <Button
        data-testid="SettingsMcpAvailableChip-connect"
        disabled={isConnecting}
        size="sm"
        type="submit"
      >
        {MCP_CATALOG_COPY.connect}
      </Button>
    </fetcher.Form>
  );
  const errorMarkup = (
    <p className="text-destructive text-sm" role="alert">
      {actionError}
    </p>
  );

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <Popover>
      <PopoverTrigger asChild={true}>
        <Button
          data-testid="SettingsMcpAvailableChip"
          size="sm"
          variant="outline"
        >
          <SettingsMcpConnectorIcon
            className="size-5 border-0 bg-transparent"
            iconHint={connector.iconHint}
          />
          {connector.name}
          <PlusIcon className="text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="flex w-80 flex-col gap-3"
        data-testid="SettingsMcpAvailableChip-preview"
      >
        <div className="flex items-center gap-3">
          <SettingsMcpConnectorIcon iconHint={connector.iconHint} />
          <div className="min-w-0">
            <p className="text-sm font-medium">{connector.name}</p>
            <p className="text-muted-foreground text-xs">
              {getProviderLabel(connector.provider)}
            </p>
          </div>
        </div>
        <p className="text-muted-foreground text-sm">{connector.description}</p>
        <p className="text-muted-foreground text-xs">{facts.join(' · ')}</p>
        {actionError ? errorMarkup : null}
        <div className="flex items-center gap-2">
          {isApiToken ? tokenAction : oauthAction}
          <Button asChild={true} size="sm" variant="ghost">
            <a href={connector.docsUrl} rel="noreferrer" target="_blank">
              <ExternalLinkIcon />
              {MCP_CATALOG_COPY.docs}
            </a>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};
