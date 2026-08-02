import * as React from 'react';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, test } from 'vitest';
import { SettingsStorage } from '../SettingsStorage';
import { renderRoutesStub } from '~/testing/route-fixtures';

describe('SettingsStorage Component', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  test('renders empty storage sections before refresh', () => {
    renderRoutesStub(<SettingsStorage />);

    expect(screen.getByText('Storage: local & session')).toBeInTheDocument();
    expect(screen.getByText('Local storage')).toBeInTheDocument();
    expect(screen.getByText('Session storage')).toBeInTheDocument();
    expect(screen.getAllByText('No keys.')).toHaveLength(2);
  });

  test('lists local and session keys after Refresh', async () => {
    const user = userEvent.setup();
    window.localStorage.setItem('ot-pref', 'enabled');
    window.sessionStorage.setItem('ot-tab', 'debug');

    renderRoutesStub(<SettingsStorage />);

    await user.click(screen.getByRole('button', { name: 'Refresh' }));

    expect(screen.getByText('ot-pref')).toBeInTheDocument();
    expect(screen.getByText('enabled')).toBeInTheDocument();
    expect(screen.getByText('ot-tab')).toBeInTheDocument();
    expect(screen.getByText('debug')).toBeInTheDocument();
  });
});
