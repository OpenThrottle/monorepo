import * as React from 'react';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@openthrottle/react-router-shadcn';
import { Form } from 'react-router';
import type {
  McpConnectorConnectionFieldsFragment,
  McpConnectorFieldsFragment,
} from '~/__generated__/graphql';
import { SettingsMcpConnectionStatusBadge } from './SettingsMcpConnectionStatusBadge';

export interface SettingsMcpConnectionActionsProps {
  connection: McpConnectorConnectionFieldsFragment;
  connector: McpConnectorFieldsFragment;
}

export const SettingsMcpConnectionActions = (
  props: SettingsMcpConnectionActionsProps,
): React.ReactElement => {
  const { connection, connector } = props;

  // Hooks

  // Setup
  const status = connection.enabled ? 'enabled' : 'disabled';
  const nextEnabled = connection.enabled ? 'false' : 'true';

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <Card data-testid="SettingsMcpConnectionActions">
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle>Connection</CardTitle>
          <SettingsMcpConnectionStatusBadge status={status} />
        </div>
        <CardDescription>
          {connection.credentialPrefix
            ? `Credential ${connection.credentialPrefix}`
            : 'Connected via OAuth.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        <Form action={`/settings/mcp/${connector.key}`} method="post">
          <input name="intent" type="hidden" value="setEnabled" />
          <input name="connectorKey" type="hidden" value={connector.key} />
          <input name="enabled" type="hidden" value={nextEnabled} />
          <Button
            data-testid="SettingsMcpConnectionActions-toggle"
            size="sm"
            type="submit"
            variant="outline"
          >
            {connection.enabled ? 'Disable' : 'Enable'}
          </Button>
        </Form>
        <Form action={`/settings/mcp/${connector.key}`} method="post">
          <input name="intent" type="hidden" value="disconnect" />
          <input name="connectorKey" type="hidden" value={connector.key} />
          <Button
            data-testid="SettingsMcpConnectionActions-disconnect"
            size="sm"
            type="submit"
            variant="destructive"
          >
            Disconnect
          </Button>
        </Form>
      </CardContent>
    </Card>
  );
};
