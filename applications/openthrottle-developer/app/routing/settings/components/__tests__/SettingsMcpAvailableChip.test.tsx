import { waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { describe, expect, test } from 'vitest';

import {
  MOCK_POSTGRES_CONNECTOR,
  MOCK_SLACK_CONNECTOR,
} from '~/routing/settings/data/mock.mcp-connectors';
import { renderRoutesStub } from '~/testing/route-fixtures';

import { SettingsMcpAvailableChip } from '../SettingsMcpAvailableChip';

describe('SettingsMcpAvailableChip Component', () => {
  test('renders a chip and keeps the preview closed', () => {
    const component = renderRoutesStub(
      <SettingsMcpAvailableChip connector={MOCK_SLACK_CONNECTOR} />,
    );

    expect(component.getByTestId('SettingsMcpAvailableChip')).toHaveTextContent(
      'Slack',
    );
    expect(
      component.queryByTestId('SettingsMcpAvailableChip-preview'),
    ).not.toBeInTheDocument();
  });

  describe('with an OAuth connector', () => {
    test('opens a preview with a Connect submit button', async () => {
      const user = userEvent.setup();
      const component = renderRoutesStub(
        <SettingsMcpAvailableChip connector={MOCK_SLACK_CONNECTOR} />,
      );

      await user.click(component.getByTestId('SettingsMcpAvailableChip'));

      await waitFor(() => {
        expect(
          component.getByTestId('SettingsMcpAvailableChip-preview'),
        ).toBeInTheDocument();
      });
      expect(
        component.getByText(MOCK_SLACK_CONNECTOR.description),
      ).toBeInTheDocument();
      expect(
        component.getByTestId('SettingsMcpAvailableChip-connect'),
      ).toHaveAttribute('type', 'submit');
    });
  });

  describe('with an API token connector', () => {
    test('links to the connector page to add a token', async () => {
      const user = userEvent.setup();
      const component = renderRoutesStub(
        <SettingsMcpAvailableChip connector={MOCK_POSTGRES_CONNECTOR} />,
      );

      await user.click(component.getByTestId('SettingsMcpAvailableChip'));

      await waitFor(() => {
        expect(
          component.getByTestId('SettingsMcpAvailableChip-connect'),
        ).toHaveAttribute('href', '/settings/mcp/postgres');
      });
    });
  });
});
