import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { SettingsMcpConnectorCard } from './SettingsMcpConnectorCard';
import type { SettingsMcpConnectorCardProps } from './SettingsMcpConnectorCard';
import type {
  McpConnectorConnectionFieldsFragment,
  McpConnectorFieldsFragment,
} from '~/__generated__/graphql';

const connector = (
  overrides: Partial<McpConnectorFieldsFragment> = {},
): McpConnectorFieldsFragment => ({
  __typename: 'McpConnectorObject',
  authType: 'oauth',
  category: 'productivity',
  description: 'Manage issues and pull requests.',
  docsUrl: 'https://docs.github.com',
  endpointUrl: null,
  iconHint: 'github',
  key: 'github',
  name: 'GitHub',
  provider: 'anthropic-directory',
  transport: 'remote-http',
  ...overrides,
});

const connection = (
  overrides: Partial<McpConnectorConnectionFieldsFragment> = {},
): McpConnectorConnectionFieldsFragment => ({
  __typename: 'McpConnectorConnectionObject',
  authType: 'oauth',
  connectedAt: '2026-01-01T00:00:00.000Z',
  connectorKey: 'github',
  credentialLabel: null,
  credentialPrefix: null,
  enabled: true,
  id: 'connection-1',
  lastUsedAt: null,
  ...overrides,
});

describe('SettingsMcpConnectorCard Component', () => {
  let component: RenderResult;
  let props: SettingsMcpConnectorCardProps;

  beforeEach(() => {
    props = { connection: undefined, connector: connector() };
  });

  const renderCard = (): RenderResult => {
    const Component = () => <SettingsMcpConnectorCard {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    return render(<RoutesStub />);
  };

  test('renders the connector name, description, and metadata badges', () => {
    component = renderCard();

    expect(
      component.getByTestId('SettingsMcpConnectorCard'),
    ).toBeInTheDocument();
    expect(component.getByText('GitHub')).toBeInTheDocument();
    expect(
      component.getByText('Manage issues and pull requests.'),
    ).toBeInTheDocument();
    expect(component.getByText('productivity')).toBeInTheDocument();
    expect(component.getByText('OAuth')).toBeInTheDocument();
    expect(component.getByText('Remote (HTTP)')).toBeInTheDocument();
  });

  test('shows a Connect action and disconnected status when there is no connection', () => {
    component = renderCard();

    const link = component.getByTestId('SettingsMcpConnectorCard-manage');
    expect(link).toHaveTextContent('Connect');
    expect(link).toHaveAttribute('href', '/settings/mcp/github');
  });

  test('shows a Manage action when a connection exists', () => {
    props = { ...props, connection: connection() };
    component = renderCard();

    expect(
      component.getByTestId('SettingsMcpConnectorCard-manage'),
    ).toHaveTextContent('Manage');
  });
});
