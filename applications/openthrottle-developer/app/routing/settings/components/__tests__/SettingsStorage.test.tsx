import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { beforeEach, describe, expect, test } from 'vitest';

import { renderRoutesStub } from '~/testing/route-fixtures';

import { SettingsStorage } from '../SettingsStorage';

describe('SettingsStorage Component', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  test('renders empty storage sections before refresh', () => {
    const component = renderRoutesStub(<SettingsStorage />);

    expect(component.getByText('Storage: local & session')).toBeInTheDocument();
    expect(component.getByText('Local storage')).toBeInTheDocument();
    expect(component.getByText('Session storage')).toBeInTheDocument();
    expect(component.getAllByText('No keys.')).toHaveLength(2);
  });

  test('lists local and session keys after Refresh', async () => {
    const user = userEvent.setup();
    window.localStorage.setItem('ot-pref', 'enabled');
    window.sessionStorage.setItem('ot-tab', 'debug');

    const component = renderRoutesStub(<SettingsStorage />);

    await user.click(component.getByRole('button', { name: 'Refresh' }));

    expect(component.getByText('ot-pref')).toBeInTheDocument();
    expect(component.getByText('enabled')).toBeInTheDocument();
    expect(component.getByText('ot-tab')).toBeInTheDocument();
    expect(component.getByText('debug')).toBeInTheDocument();
  });
});
