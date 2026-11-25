import * as React from 'react';
import { describe, expect, test } from 'vitest';

import {
  MOCK_GITHUB_CONNECTION,
  MOCK_GITHUB_CONNECTOR,
  MOCK_POSTGRES_CONNECTOR,
  MOCK_SLACK_CONNECTOR,
} from '~/routing/settings/data/mock.mcp-connectors';
import { renderRoutesStub } from '~/testing/route-fixtures';

import { SettingsMcpCatalog } from '../SettingsMcpCatalog';

const connectors = [
  MOCK_POSTGRES_CONNECTOR,
  MOCK_SLACK_CONNECTOR,
  MOCK_GITHUB_CONNECTOR,
];

describe('SettingsMcpCatalog Component', () => {
  test('splits connected rows from available chips', () => {
    const component = renderRoutesStub(
      <SettingsMcpCatalog
        connections={[MOCK_GITHUB_CONNECTION]}
        connectors={connectors}
        manageKey={null}
      />,
    );

    expect(component.getAllByTestId('SettingsMcpConnectedRow')).toHaveLength(1);
    expect(
      component
        .getAllByTestId('SettingsMcpAvailableChip')
        .map((chip) => chip.textContent),
    ).toEqual(['Slack', 'Postgres']);
  });

  test('opens only the panel named by manageKey', () => {
    const component = renderRoutesStub(
      <SettingsMcpCatalog
        connections={[
          MOCK_GITHUB_CONNECTION,
          { ...MOCK_GITHUB_CONNECTION, connectorKey: 'slack', id: 'c-2' },
        ]}
        connectors={connectors}
        manageKey="slack"
      />,
    );

    const rows = component.getAllByTestId('SettingsMcpConnectedRow');
    // Both are anthropic-directory, so they keep their incoming order.
    expect(rows.map((row) => row.getAttribute('data-state'))).toEqual([
      'open',
      'closed',
    ]);
    expect(component.getAllByTestId('SettingsMcpManagePanel')).toHaveLength(1);
  });

  test('shows an empty state when nothing is connected', () => {
    const component = renderRoutesStub(
      <SettingsMcpCatalog
        connections={[]}
        connectors={connectors}
        manageKey={null}
      />,
    );

    expect(
      component.getByTestId('SettingsMcpCatalog-connectedEmpty'),
    ).toBeInTheDocument();
    expect(component.getAllByTestId('SettingsMcpAvailableChip')).toHaveLength(
      3,
    );
  });

  test('hides the available section when everything is connected', () => {
    const component = renderRoutesStub(
      <SettingsMcpCatalog
        connections={[MOCK_GITHUB_CONNECTION]}
        connectors={[MOCK_GITHUB_CONNECTOR]}
        manageKey={null}
      />,
    );

    expect(
      component.queryByTestId('SettingsMcpAvailableChip'),
    ).not.toBeInTheDocument();
  });

  test('renders nothing when there are no connectors', () => {
    const component = renderRoutesStub(
      <SettingsMcpCatalog connections={[]} connectors={[]} manageKey={null} />,
    );

    expect(component.getByTestId('SettingsMcpCatalog')).toBeEmptyDOMElement();
  });
});
