import * as React from 'react';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
} from '@openthrottle/react-router-shadcn';
import { Form } from 'react-router';
import type { McpConnectorFieldsFragment } from '~/__generated__/graphql';

export interface SettingsMcpConnectFormProps {
  actionError: string | null;
  connector: McpConnectorFieldsFragment;
  isConnected: boolean;
}

export const SettingsMcpConnectForm = (
  props: SettingsMcpConnectFormProps,
): React.ReactElement => {
  const { actionError, connector, isConnected } = props;

  // Hooks

  // Setup
  const isApiToken = connector.authType === 'api_token';
  const submitLabel = isConnected
    ? isApiToken
      ? 'Update token'
      : 'Reconnect'
    : 'Connect';

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <Card data-testid="SettingsMcpConnectForm">
      <CardHeader>
        <CardTitle>{isConnected ? 'Update connection' : 'Connect'}</CardTitle>
        <CardDescription>
          {isApiToken
            ? 'Paste an API token for this connector. It is stored hashed and never shown again.'
            : 'This connector uses OAuth. Connecting records the connection; the OAuth handshake runs when connectors are wired into agent runs.'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form
          action={`/settings/mcp/${connector.key}`}
          className="flex flex-col gap-4"
          method="post"
        >
          <input name="intent" type="hidden" value="connect" />
          <input name="connectorKey" type="hidden" value={connector.key} />
          {isApiToken ? (
            <>
              <div className="flex flex-col gap-2">
                <Label htmlFor="settings-mcp-api-token">API token</Label>
                <Input
                  autoComplete="off"
                  data-testid="SettingsMcpConnectForm-token"
                  id="settings-mcp-api-token"
                  name="apiToken"
                  type="password"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="settings-mcp-label">Label (optional)</Label>
                <Input
                  data-testid="SettingsMcpConnectForm-label"
                  id="settings-mcp-label"
                  name="label"
                  type="text"
                />
              </div>
            </>
          ) : null}
          {actionError ? (
            <p
              className="text-destructive text-sm"
              data-testid="SettingsMcpConnectForm-error"
            >
              {actionError}
            </p>
          ) : null}
          <div>
            <Button
              data-testid="SettingsMcpConnectForm-submit"
              size="sm"
              type="submit"
            >
              {submitLabel}
            </Button>
          </div>
        </Form>
      </CardContent>
    </Card>
  );
};
