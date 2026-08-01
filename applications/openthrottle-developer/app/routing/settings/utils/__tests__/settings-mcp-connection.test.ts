import { describe, expect, it } from 'vitest';
import type {
  McpConnectorConnectionFieldsFragment,
  McpConnectorFieldsFragment,
} from '~/__generated__/graphql';
import {
  getConnectorStatus,
  getProviderLabel,
  groupConnectorsByProvider,
  indexConnectionsByKey,
} from '../settings-mcp-connection';

const connector = (
  key: string,
  provider: string,
): McpConnectorFieldsFragment => ({
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
});

const connection = (
  connectorKey: string,
  enabled: boolean,
): McpConnectorConnectionFieldsFragment => ({
  __typename: 'McpConnectorConnectionObject',
  authType: 'oauth',
  connectedAt: '2026-02-02T10:00:00.000Z',
  connectorKey,
  credentialLabel: null,
  credentialPrefix: null,
  enabled,
  id: connectorKey,
  lastUsedAt: null,
});

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
