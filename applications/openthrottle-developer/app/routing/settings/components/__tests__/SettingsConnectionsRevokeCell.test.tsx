import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';

import { SETTINGS_CONNECTIONS_COPY } from '~/routing/settings/data/data.copy';

import { SettingsConnectionsRevokeCell } from '../SettingsConnectionsRevokeCell';

describe('SettingsConnectionsRevokeCell', () => {
  test('asks for confirmation naming the app before revoking', async () => {
    const user = userEvent.setup();
    const Component = () => {
      return (
        <SettingsConnectionsRevokeCell appName="Claude Code" grantId="g-1" />
      );
    };
    const Stub = createRoutesStub([{ Component, path: '/' }]);
    const component = render(<Stub />);

    await user.click(
      component.getByTestId('SettingsConnectionsTable-revoke-g-1'),
    );

    expect(await component.findByRole('alertdialog')).toHaveTextContent(
      'Claude Code',
    );
    expect(
      component.getByTestId('SettingsConnectionsTable-revoke-submit-g-1'),
    ).toHaveTextContent(SETTINGS_CONNECTIONS_COPY.revokeConfirm);
  });
});
