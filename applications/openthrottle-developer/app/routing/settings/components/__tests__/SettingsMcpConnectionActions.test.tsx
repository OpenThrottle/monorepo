import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { SettingsMcpConnectionActions } from '../SettingsMcpConnectionActions';
import type { SettingsMcpConnectionActionsProps } from '../SettingsMcpConnectionActions';
import type {
  McpConnectorConnectionFieldsFragment,
  McpConnectorFieldsFragment,
} from '~/__generated__/graphql';

const githubConnector: McpConnectorFieldsFragment = {
  __typename: 'McpConnectorObject',
  authType: 'oauth',
  category: 'Development',
  description: 'GitHub repositories and pull requests.',
  docsUrl: 'https://github.com/github/github-mcp-server',
  endpointUrl: 'https://api.githubcopilot.com/mcp/',
  iconHint: 'github',
  key: 'github',
  name: 'GitHub',
  provider: 'anthropic-directory',
  transport: 'remote-http',
};

const githubConnection: McpConnectorConnectionFieldsFragment = {
  __typename: 'McpConnectorConnectionObject',
  authType: 'oauth',
  connectedAt: '2026-02-02T10:00:00.000Z',
  connectorKey: 'github',
  credentialLabel: null,
  credentialPrefix: null,
  enabled: true,
  id: '11111111-1111-4111-8111-111111111111',
  lastUsedAt: null,
};

describe('SettingsMcpConnectionActions Component', () => {
  let component: RenderResult;
  let props: SettingsMcpConnectionActionsProps;

  beforeEach(() => {
    props = { connection: githubConnection, connector: githubConnector };
    const RoutesStub = createRoutesStub([
      {
        Component: () => <SettingsMcpConnectionActions {...props} />,
        path: '/',
      },
    ]);
    component = render(<RoutesStub />);
  });

  test('renders a Disable action and OAuth description for an enabled connection', () => {
    expect(component.getByTestId('SettingsMcpConnectionActions')).toBeTruthy();
    expect(component.getByText('Connected via OAuth.')).toBeTruthy();
    expect(
      component.getByTestId('SettingsMcpConnectionActions-toggle'),
    ).toHaveTextContent('Disable');
  });

  test('renders an Enable action and credential description for a disabled, credentialed connection', () => {
    component.unmount();
    props = {
      connection: {
        ...githubConnection,
        credentialPrefix: 'sk_live_ab',
        enabled: false,
      },
      connector: githubConnector,
    };
    const RoutesStub = createRoutesStub([
      {
        // eslint-disable-next-line react/no-multi-comp
        Component: () => <SettingsMcpConnectionActions {...props} />,
        path: '/',
      },
    ]);
    component = render(<RoutesStub />);

    expect(component.getByText('Credential sk_live_ab')).toBeTruthy();
    expect(
      component.getByTestId('SettingsMcpConnectionActions-toggle'),
    ).toHaveTextContent('Enable');
  });

  test('renders a Disconnect action', () => {
    expect(
      component.getByTestId('SettingsMcpConnectionActions-disconnect'),
    ).toHaveTextContent('Disconnect');
  });
});
