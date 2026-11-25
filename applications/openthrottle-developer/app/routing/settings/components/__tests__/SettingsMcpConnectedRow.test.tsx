import * as React from 'react';
import { describe, expect, test } from 'vitest';

import {
  MOCK_GITHUB_CONNECTION,
  MOCK_GITHUB_CONNECTOR,
} from '~/routing/settings/data/mock.mcp-connectors';
import { renderRoutesStub } from '~/testing/route-fixtures';

import { SettingsMcpConnectedRow } from '../SettingsMcpConnectedRow';

describe('SettingsMcpConnectedRow Component', () => {
  describe('when closed', () => {
    test('links Manage to open this connector and hides the panel', () => {
      const component = renderRoutesStub(
        <SettingsMcpConnectedRow
          connection={MOCK_GITHUB_CONNECTION}
          connector={MOCK_GITHUB_CONNECTOR}
          isOpen={false}
        />,
      );

      const manage = component.getByTestId('SettingsMcpConnectedRow-manage');
      expect(manage).toHaveAttribute('href', '/?manage=github');
      expect(manage).toHaveAttribute('aria-expanded', 'false');
      expect(
        component.queryByTestId('SettingsMcpManagePanel'),
      ).not.toBeInTheDocument();
    });

    test('reflects the enabled flag on the switch', () => {
      const component = renderRoutesStub(
        <SettingsMcpConnectedRow
          connection={{ ...MOCK_GITHUB_CONNECTION, enabled: false }}
          connector={MOCK_GITHUB_CONNECTOR}
          isOpen={false}
        />,
      );

      expect(
        component.getByRole('switch', { name: 'Enable GitHub' }),
      ).toHaveAttribute('aria-checked', 'false');
      expect(
        component.getByTestId('SettingsMcpConnectedRow-summary'),
      ).toHaveTextContent(/^Disabled · /);
    });
  });

  describe('when open', () => {
    test('shows the manage panel and links back to close it', () => {
      const component = renderRoutesStub(
        <SettingsMcpConnectedRow
          connection={MOCK_GITHUB_CONNECTION}
          connector={MOCK_GITHUB_CONNECTOR}
          isOpen={true}
        />,
      );

      const manage = component.getByTestId('SettingsMcpConnectedRow-manage');
      expect(manage).toHaveAttribute('aria-expanded', 'true');
      expect(manage.getAttribute('href')).not.toContain('manage=');
      expect(
        component.getByTestId('SettingsMcpManagePanel'),
      ).toBeInTheDocument();
    });
  });
});
