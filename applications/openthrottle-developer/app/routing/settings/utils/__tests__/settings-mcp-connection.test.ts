import { describe, expect, it } from 'vitest';

import type {
  McpConnectorConnectionFieldsFragment,
  McpConnectorFieldsFragment,
} from '~/__generated__/graphql';

import {
  formatTimeAgo,
  getConnectionSummary,
  getConnectorStatus,
  getProviderLabel,
  groupConnectorsByProvider,
  indexConnectionsByKey,
  partitionConnectors,
} from '../settings-mcp-connection';

const connector = (
  key: string,
  provider: string,
): McpConnectorFieldsFragment => {
  return {
    __typename: 'McpConnectorObject',
    authType: 'oauth',
    category: 'Development',
    description: 'desc',
    docsUrl: 'https://example.com',
    endpointUrl: null,
    iconHint: key,
    key,
    name: key,
    provider,
    transport: 'remote-http',
  };
};

const connection = (
  connectorKey: string,
  enabled: boolean,
): McpConnectorConnectionFieldsFragment => {
  return {
    __typename: 'McpConnectorConnectionObject',
    authType: 'oauth',
    connectedAt: '2026-02-02T10:00:00.000Z',
    connectorKey,
    credentialLabel: null,
    credentialPrefix: null,
    enabled,
    id: connectorKey,
    lastUsedAt: null,
  };
};

describe('getConnectorStatus', () => {
  it('is disconnected without a connection', () => {
    expect(getConnectorStatus(undefined)).toBe('disconnected');
  });

  it('reflects the enabled flag', () => {
    expect(getConnectorStatus(connection('github', true))).toBe('enabled');
    expect(getConnectorStatus(connection('github', false))).toBe('disabled');
  });
});

describe('indexConnectionsByKey', () => {
  it('keys connections by connectorKey', () => {
    const map = indexConnectionsByKey([connection('github', true)]);
    expect(map.get('github')?.enabled).toBe(true);
    expect(map.get('missing')).toBeUndefined();
  });
});

describe('getProviderLabel', () => {
  it('maps known providers and falls back for unknown ones', () => {
    expect(getProviderLabel('anthropic-directory')).toBe(
      'Anthropic connector directory',
    );
    expect(getProviderLabel('mystery')).toBe('Other');
  });
});

describe('groupConnectorsByProvider', () => {
  it('orders groups by configured provider order, unknown last', () => {
    const groups = groupConnectorsByProvider([
      connector('supabase', 'vendor-remote'),
      connector('mystery', 'mystery'),
      connector('github', 'anthropic-directory'),
      connector('postgres', 'mcp-registry'),
    ]);
    expect(groups.map((group) => group.provider)).toStrictEqual([
      'anthropic-directory',
      'mcp-registry',
      'vendor-remote',
      'mystery',
    ]);
  });
});

describe('partitionConnectors', () => {
  it('splits connected from available, both in provider order', () => {
    const result = partitionConnectors(
      [
        connector('postgres', 'mcp-registry'),
        connector('github', 'anthropic-directory'),
        connector('slack', 'anthropic-directory'),
      ],
      [connection('postgres', false)],
    );

    expect(result.connected.map((entry) => entry.connector.key)).toEqual([
      'postgres',
    ]);
    expect(result.available.map((entry) => entry.key)).toEqual([
      'github',
      'slack',
    ]);
  });
});

describe('formatTimeAgo', () => {
  const now = new Date('2026-02-05T10:00:00.000Z');

  it('is null for a missing or invalid value', () => {
    expect(formatTimeAgo(null, now)).toBeNull();
    expect(formatTimeAgo('not a date', now)).toBeNull();
  });

  it('formats a past time relative to now', () => {
    expect(formatTimeAgo('2026-02-02T10:00:00.000Z', now)).toBe('3 days ago');
  });

  it('says just now for a time at or after now', () => {
    expect(formatTimeAgo('2026-02-05T10:00:00.000Z', now)).toBe('just now');
  });
});

describe('getConnectionSummary', () => {
  const now = new Date('2026-02-05T10:00:00.000Z');

  it('summarises an unused enabled connection', () => {
    expect(getConnectionSummary(connection('github', true), now)).toBe(
      'Connected 3 days ago · not used yet',
    );
  });

  it('leads with Disabled and includes last use', () => {
    const disabled = {
      ...connection('github', false),
      lastUsedAt: '2026-02-05T08:00:00.000Z',
    };

    expect(getConnectionSummary(disabled, now)).toBe(
      'Disabled · Connected 3 days ago · last used 2 hours ago',
    );
  });
});
