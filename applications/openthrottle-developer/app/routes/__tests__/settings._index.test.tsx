import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, test } from 'vitest';
import SettingsIndex from '../settings._index';
import { getSettingsDiagnosticsLoaderData } from '~/routing/settings/utils/settings-diagnostics-loader-data';

describe('routes/settings._index.tsx', () => {
  test('should render', () => {
    render(
      <MemoryRouter>
        <SettingsIndex
          actionData={undefined}
          loaderData={getSettingsDiagnosticsLoaderData()}
          matches={[] as never}
          params={{}}
        />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole('heading', { name: 'Settings' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Controls for the OpenThrottle Developer portal/i),
    ).toBeInTheDocument();
  });
});
