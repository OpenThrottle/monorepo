import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, test } from 'vitest';
import SettingsApplication from '../settings.application';
import { getSettingsDiagnosticsLoaderData } from '~/routing/settings/utils/settings-diagnostics-loader-data';

describe('routes/settings.application.tsx', () => {
  test('should render', () => {
    render(
      <MemoryRouter>
        <SettingsApplication
          actionData={undefined}
          loaderData={getSettingsDiagnosticsLoaderData()}
          matches={[] as never}
          params={{}}
        />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole('heading', { name: 'Application' }),
    ).toBeInTheDocument();
  });
});
