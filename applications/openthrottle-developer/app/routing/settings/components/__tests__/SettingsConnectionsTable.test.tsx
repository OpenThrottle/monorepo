import { render } from '@testing-library/react';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';

import { SETTINGS_CONNECTIONS_COPY } from '~/routing/settings/data/copy';

import type { SettingsConnectionsTableProps } from '../SettingsConnectionsTable';
import { SettingsConnectionsTable } from '../SettingsConnectionsTable';

const connection = (
  id: string,
  scopes: string[],
): SettingsConnectionsTableProps['connections'][number] => {
  return {
    __typename: 'OAuthGrantObject',
    clientHost: 'claude.ai',
    clientName: `Client ${id}`,
    createdAt: '2026-11-01T00:00:00.000Z',
    expiresAt: '2026-12-01T00:00:00.000Z',
    id,
    lastUsedAt: null,
    resource: 'https://mcp.example.com/mcp',
    scopes,
  };
};

const renderTable = (
  connections: SettingsConnectionsTableProps['connections'],
) => {
  const Component = () => {
    return <SettingsConnectionsTable connections={connections} />;
  };
  const Stub = createRoutesStub([{ Component, path: '/' }]);
  return render(<Stub />);
};

describe('SettingsConnectionsTable', () => {
  test('lists each connection with its access level and a revoke control', () => {
    const component = renderTable([
      connection('a', ['mcp:read', 'mcp:write']),
      connection('b', ['mcp:read']),
    ]);

    expect(component.getByText('Client a')).toBeInTheDocument();
    expect(
      component.getByText(SETTINGS_CONNECTIONS_COPY.accessReadWrite),
    ).toBeInTheDocument();
    expect(
      component.getByText(SETTINGS_CONNECTIONS_COPY.accessRead),
    ).toBeInTheDocument();
    expect(
      component.getByTestId('SettingsConnectionsTable-revoke-a'),
    ).toBeInTheDocument();
  });

  test('shows the empty state with no connections', () => {
    const component = renderTable([]);

    expect(
      component.getByText(SETTINGS_CONNECTIONS_COPY.empty),
    ).toBeInTheDocument();
  });
});
