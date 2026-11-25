import { render, within } from '@testing-library/react';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';

import type {
  McpConnectorConnectionFieldsFragment,
  McpConnectorFieldsFragment,
} from '~/__generated__/graphql';

import Component from '../settings.mcp._index';

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
  initialEntry = '/settings/mcp',
) => {
  const Stub = createRoutesStub([
    {
      Component,
      loader: () => ({ connections, connectors }),
      path: '/settings/mcp',
    },
  ]);
  return render(<Stub initialEntries={[initialEntry]} />);
};

describe('routes/settings.mcp._index.tsx', () => {
  test('lists connected connectors as rows and the rest as chips', async () => {
    const component = renderRoute(
      [githubConnector, postgresConnector],
      [githubConnection],
    );

    const rows = await component.findAllByTestId('SettingsMcpConnectedRow');
    expect(rows).toHaveLength(1);
    const [githubRow] = rows;
    if (githubRow === undefined) {
      throw new Error('expected the GitHub row');
    }
    expect(within(githubRow).getByText('GitHub')).toBeInTheDocument();

    const chips = component.getAllByTestId('SettingsMcpAvailableChip');
    expect(chips.map((chip) => chip.textContent)).toEqual(['Postgres']);
  });

  test('opens the Manage panel named in the URL', async () => {
    const component = renderRoute(
      [githubConnector, postgresConnector],
      [githubConnection],
      '/settings/mcp?manage=github',
    );

    expect(
      await component.findByTestId('SettingsMcpManagePanel'),
    ).toBeInTheDocument();
  });
});
