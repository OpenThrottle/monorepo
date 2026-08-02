import * as React from 'react';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@openthrottle/react-router-shadcn';
import type { McpConnectorFieldsFragment } from '~/__generated__/graphql';
import {
  MCP_AUTH_TYPE_LABEL,
  MCP_TRANSPORT_LABEL,
} from '~/routing/settings/data/mcp-connectors.data';
import { getProviderLabel } from '~/routing/settings/utils/settings-mcp-connection';

export interface SettingsMcpSetupDocsProps {
  connector: McpConnectorFieldsFragment;
}

export const SettingsMcpSetupDocs = (
  props: SettingsMcpSetupDocsProps,
): React.ReactElement => {
  const { connector } = props;

  // Hooks

  // Setup
  const authLabel =
    MCP_AUTH_TYPE_LABEL[connector.authType] ?? connector.authType;
  const transportLabel =
    MCP_TRANSPORT_LABEL[connector.transport] ?? connector.transport;

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <Card data-testid="SettingsMcpSetupDocs">
      <CardHeader>
        <CardTitle>Setup</CardTitle>
        <CardDescription>{connector.description}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-2">
          <Badge color="slate">{getProviderLabel(connector.provider)}</Badge>
          <Badge color="blue">{authLabel}</Badge>
          <Badge color="violet">{transportLabel}</Badge>
        </div>
        <dl className="text-sm">
          <div className="flex gap-2">
            <dt className="text-muted-foreground w-24 shrink-0">Endpoint</dt>
            <dd className="break-all">
              {connector.endpointUrl ?? 'Local / directory-brokered'}
            </dd>
          </div>
        </dl>
        <Button asChild={true} size="sm" variant="outline">
          <a
            data-testid="SettingsMcpSetupDocs-link"
            href={connector.docsUrl}
            rel="noreferrer"
            target="_blank"
          >
            Setup docs
          </a>
        </Button>
      </CardContent>
    </Card>
  );
};
