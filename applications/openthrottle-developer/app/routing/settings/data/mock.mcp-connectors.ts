/**
 * @description Fixtures for the MCP connectors catalog tests.
 */

import type {
  McpConnectorConnectionFieldsFragment,
  McpConnectorFieldsFragment,
} from '~/__generated__/graphql';

export const MOCK_GITHUB_CONNECTOR: McpConnectorFieldsFragment = {
  __typename: 'McpConnectorObject',
  authType: 'oauth',
  category: 'Development',
  description: 'Repositories, issues, and pull requests.',
  docsUrl: 'https://github.com/github/github-mcp-server',
  endpointUrl: 'https://api.githubcopilot.com/mcp/',
  iconHint: 'github',
  key: 'github',
  name: 'GitHub',
  provider: 'anthropic-directory',
  transport: 'remote-http',
};

export const MOCK_POSTGRES_CONNECTOR: McpConnectorFieldsFragment = {
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

export const MOCK_SLACK_CONNECTOR: McpConnectorFieldsFragment = {
  __typename: 'McpConnectorObject',
  authType: 'oauth',
  category: 'Communication',
  description: 'Slack channels, messages, and search.',
  docsUrl: 'https://example.com/slack',
  endpointUrl: null,
  iconHint: 'slack',
  key: 'slack',
  name: 'Slack',
  provider: 'anthropic-directory',
  transport: 'remote-http',
};

export const MOCK_GITHUB_CONNECTION: McpConnectorConnectionFieldsFragment = {
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
