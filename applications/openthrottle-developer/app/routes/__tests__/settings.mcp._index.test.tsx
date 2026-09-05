import * as React from 'react';
import { render, within } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';
import Component from '../settings.mcp._index';
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

const postgresConnector: McpConnectorFieldsFragment = {
  __typename: 'McpConnectorObject',
  authType: 'api_token',
  category: 'Database',
  description: 'Read-only SQL over Postgres.',
  docsUrl: 'https://example.com/postgres',
  endpointUrl: null,
  iconHint: 'postgres',
  key: 'postgres',
  name: 'Postgres',
  provider: 'mcp-registry',
  transport: 'local-stdio',
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

const renderRoute = (
  connectors: McpConnectorFieldsFragment[],
  connections: McpConnectorConnectionFieldsFragment[],
) => {
  const Stub = createRoutesStub([
    {
      Component,
      loader: () => ({ connections, connectors }),
      path: '/settings/mcp',
    },
  ]);
  return render(<Stub initialEntries={['/settings/mcp']} />);
};

describe('routes/settings.mcp._index.tsx', () => {
  test('groups connectors by provider with their catalog names', async () => {
    const component = renderRoute(
      [githubConnector, postgresConnector],
      [githubConnection],
    );

    expect(
      await component.findByText('Anthropic connector directory'),
    ).toBeInTheDocument();
    expect(component.getByText('Official MCP registry')).toBeInTheDocument();

    // The route renders inside a beta GlobalScreen, whose banner carries its own
    // "GitHub" link, so scope connector-name lookups to the connector cards.
    const cards = component.getAllByTestId('SettingsMcpConnectorCard');

    expect(
      cards.some((card) => within(card).queryByText('GitHub') !== null),
    ).toBe(true);
    expect(
      cards.some((card) => within(card).queryByText('Postgres') !== null),
    ).toBe(true);
  });

  test('shows connected/not-connected status and a manage link per connector', async () => {
    const component = renderRoute(
      [githubConnector, postgresConnector],
      [githubConnection],
    );

    const cards = await component.findAllByTestId('SettingsMcpConnectorCard');
    expect(cards).toHaveLength(2);

    // Groups sort by provider order: anthropic-directory (GitHub) then
    // mcp-registry (Postgres).
    const [githubCard, postgresCard] = cards;

    expect(within(githubCard).getByText('GitHub')).toBeInTheDocument();
    expect(within(githubCard).getByText('Connected')).toBeInTheDocument();
    expect(
      within(githubCard).getByTestId('SettingsMcpConnectorCard-manage'),
    ).toHaveAttribute('href', '/settings/mcp/github');

    expect(within(postgresCard).getByText('Postgres')).toBeInTheDocument();
    expect(within(postgresCard).getByText('Not connected')).toBeInTheDocument();
    expect(
      within(postgresCard).getByTestId('SettingsMcpConnectorCard-manage'),
    ).toHaveAttribute('href', '/settings/mcp/postgres');
  });
});
