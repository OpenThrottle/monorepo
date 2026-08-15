import * as React from 'react';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import { SettingsSetupToolbar } from '../SettingsSetupToolbar';
import type { AgentCliFilter } from '~/routing/settings/data/agent-clis.data';

describe('SettingsSetupToolbar', () => {
  test('emits the chosen filter', async () => {
    const user = userEvent.setup();
    const onFilterChange = vi.fn<(filter: AgentCliFilter) => void>();
    const component = render(
      <SettingsSetupToolbar
        filter="all"
        installEnabled={true}
        onFilterChange={onFilterChange}
      />,
    );

    await user.click(component.getByRole('button', { name: 'Installed' }));
    expect(onFilterChange).toHaveBeenCalledWith('installed');
  });

  test('marks the active filter as pressed', () => {
    const component = render(
      <SettingsSetupToolbar
        filter="enabled"
        installEnabled={true}
        onFilterChange={() => {}}
      />,
    );
    expect(component.getByRole('button', { name: 'Enabled' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });
});
