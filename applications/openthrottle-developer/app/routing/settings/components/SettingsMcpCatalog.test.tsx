import * as React from 'react';
import type { RenderResult } from '@testing-library/react';
import { beforeEach, describe, expect, test } from 'vitest';
import { SettingsMcpCatalog } from './SettingsMcpCatalog';
import type { SettingsMcpCatalogProps } from './SettingsMcpCatalog';
import type {
  McpConnectorConnectionFieldsFragment,
  McpConnectorFieldsFragment,
} from '~/__generated__/graphql';
import { renderRoutesStub } from '~/testing/route-fixtures';

const connectorA: McpConnectorFieldsFragment = {
  __typename: 'McpConnectorObject',
  authType: 'oauth',
  category: 'productivity',
  description: 'Official MCP registry entry',
  docsUrl: 'https://example.com/docs',
  endpointUrl: null,
  iconHint: 'registry',
  key: 'mcp-registry-connector',
  name: 'Registry Connector',
  provider: 'mcp-registry',
  transport: 'remote-http',
};

const connectorB: McpConnectorFieldsFragment = {
  __typename: 'McpConnectorObject',
  authType: 'api_token',
  category: 'productivity',
  description: 'Anthropic directory entry',
  docsUrl: 'https://example.com/docs2',
  endpointUrl: null,
  iconHint: 'anthropic',
  key: 'anthropic-connector',
  name: 'Anthropic Connector',
  provider: 'anthropic-directory',
  transport: 'local-stdio',
};

const connection: McpConnectorConnectionFieldsFragment = {
  __typename: 'McpConnectorConnectionObject',
  authType: 'oauth',
  connectedAt: '2026-01-01T00:00:00Z',
  connectorKey: 'mcp-registry-connector',
  credentialLabel: null,
  credentialPrefix: null,
  enabled: true,
  id: 'connection-1',
  lastUsedAt: null,
};

describe('SettingsMcpCatalog Component', () => {
  let component: RenderResult;
  let props: SettingsMcpCatalogProps;

  beforeEach(() => {
    props = { connections: [connection], connectors: [connectorA, connectorB] };
    component = renderRoutesStub(<SettingsMcpCatalog {...props} />);
  });

  test('renders the catalog container', () => {
    expect(component.getByTestId('SettingsMcpCatalog')).toBeInTheDocument();
  });

  test('renders a card for each connector', () => {
    expect(component.getByText('Registry Connector')).toBeInTheDocument();
    expect(component.getByText('Anthropic Connector')).toBeInTheDocument();
  });

  test('groups connectors by provider with display labels, ordered by provider order', () => {
    const headings = component
      .getAllByRole('heading', { level: 2 })
      .map((heading) => heading.textContent);

    expect(headings).toEqual([
      'Anthropic connector directory',
      'Official MCP registry',
    ]);
  });

  test('renders nothing when there are no connectors', () => {
    component.unmount();
    component = renderRoutesStub(
      <SettingsMcpCatalog connections={[]} connectors={[]} />,
    );

    expect(component.getByTestId('SettingsMcpCatalog')).toBeEmptyDOMElement();
  });
});
