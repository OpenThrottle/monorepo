import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, test } from 'vitest';
import SettingsAppearance from '../settings.appearance';
import { getSettingsDiagnosticsLoaderData } from '~/routing/settings/utils/settings-diagnostics-loader-data';

/**
 * @description Legacy `settings.cusomization` route was consolidated into `settings.appearance`.
 */
describe('routes/settings.appearance.tsx (customization)', () => {
  test('should render', () => {
    render(
      <MemoryRouter>
        <SettingsAppearance
          actionData={undefined}
          loaderData={getSettingsDiagnosticsLoaderData()}
          matches={[] as never}
          params={{}}
        />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole('heading', { name: 'Appearance' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Accent color')).toBeInTheDocument();
  });
});
