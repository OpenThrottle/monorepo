import * as React from 'react';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@openthrottle/react-router-shadcn';
import { Link } from 'react-router';
import type {
  McpConnectorConnectionFieldsFragment,
  McpConnectorFieldsFragment,
} from '~/__generated__/graphql';
import {
  MCP_AUTH_TYPE_LABEL,
  MCP_TRANSPORT_LABEL,
} from '~/routing/settings/data/mcp-connectors.data';
import { getConnectorStatus } from '~/routing/settings/utils/settings-mcp-connection';
import { SettingsMcpConnectionStatusBadge } from './SettingsMcpConnectionStatusBadge';

export interface SettingsMcpConnectorCardProps {
  connection: McpConnectorConnectionFieldsFragment | undefined;
  connector: McpConnectorFieldsFragment;
}

export const SettingsMcpConnectorCard = (
  props: SettingsMcpConnectorCardProps,
): React.ReactElement => {
  const { connection, connector } = props;

  // Hooks

  // Setup
  const status = getConnectorStatus(connection);
  const authLabel =
    MCP_AUTH_TYPE_LABEL[connector.authType] ?? connector.authType;
  const transportLabel =
    MCP_TRANSPORT_LABEL[connector.transport] ?? connector.transport;

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <Card className="flex flex-col" data-testid="SettingsMcpConnectorCard">
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <CardTitle>{connector.name}</CardTitle>
          <SettingsMcpConnectionStatusBadge status={status} />
        </div>
        <CardDescription>{connector.description}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        <Badge color="slate">{connector.category}</Badge>
        <Badge color="blue">{authLabel}</Badge>
        <Badge color="violet">{transportLabel}</Badge>
      </CardContent>
      <CardFooter className="mt-auto">
        <Button asChild={true} size="sm" variant="outline">
          <Link
            data-testid="SettingsMcpConnectorCard-manage"
            to={`/settings/mcp/${connector.key}`}
          >
            {status === 'disconnected' ? 'Connect' : 'Manage'}
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
};
