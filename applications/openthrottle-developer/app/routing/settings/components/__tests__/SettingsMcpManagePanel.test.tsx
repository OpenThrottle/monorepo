import * as React from 'react';
import { describe, expect, test } from 'vitest';

import {
  MOCK_GITHUB_CONNECTION,
  MOCK_GITHUB_CONNECTOR,
  MOCK_POSTGRES_CONNECTOR,
} from '~/routing/settings/data/mock.mcp-connectors';
import { renderRoutesStub } from '~/testing/route-fixtures';

import { SettingsMcpManagePanel } from '../SettingsMcpManagePanel';

describe('SettingsMcpManagePanel Component', () => {
  describe('with an OAuth connector', () => {
    test('shows the connection facts', () => {
      const component = renderRoutesStub(
        <SettingsMcpManagePanel
          connection={MOCK_GITHUB_CONNECTION}
          connector={MOCK_GITHUB_CONNECTOR}
        />,
      );

      expect(component.getByTitle('OAuth')).toBeInTheDocument();
      expect(component.getByTitle('Remote (HTTP)')).toBeInTheDocument();
      expect(
        component.getByTitle('https://api.githubcopilot.com/mcp/'),
      ).toBeInTheDocument();
      expect(component.getByTitle('Never')).toBeInTheDocument();
    });

    test('links Reconnect to the connector page and Docs to the vendor', () => {
      const component = renderRoutesStub(
        <SettingsMcpManagePanel
          connection={MOCK_GITHUB_CONNECTION}
          connector={MOCK_GITHUB_CONNECTOR}
        />,
      );

      expect(
        component.getByTestId('SettingsMcpManagePanel-reconnect'),
      ).toHaveAttribute('href', '/settings/mcp/github');
      expect(component.getByRole('link', { name: /docs/i })).toHaveAttribute(
        'href',
        MOCK_GITHUB_CONNECTOR.docsUrl,
      );
      expect(
        component.getByTestId('SettingsMcpManagePanel-disconnect'),
      ).toHaveAttribute('type', 'submit');
    });
  });

  describe('with an API token connector', () => {
    test('shows the credential hint and offers to update the token', () => {
      const component = renderRoutesStub(
        <SettingsMcpManagePanel
          connection={{
            ...MOCK_GITHUB_CONNECTION,
            connectorKey: 'postgres',
            credentialPrefix: 'pg_abc…',
          }}
          connector={MOCK_POSTGRES_CONNECTOR}
        />,
      );

      expect(component.getByTitle('API token · pg_abc…')).toBeInTheDocument();
      expect(component.getByTitle('Brokered')).toBeInTheDocument();
      expect(
        component.getByTestId('SettingsMcpManagePanel-reconnect'),
      ).toHaveTextContent('Update token');
    });
  });
});
