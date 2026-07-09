import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, test } from 'vitest';
import SettingsIndex from '../settings._index';
import { getSettingsDiagnosticsLoaderData } from '~/routing/settings/utils/settings-diagnostics-loader-data';
import { buildRootMatch } from '~/testing/root-match-fixture';
import type { Route } from '@/app/routes/+types/settings._index';

const matches: Route.ComponentProps['matches'] = [
  buildRootMatch(),
  {
    handle: undefined,
    id: 'routes/settings._index',
    loaderData: getSettingsDiagnosticsLoaderData(),
    params: {},
    pathname: '/',
  },
];

describe('routes/settings._index.tsx', () => {
  test('should render', () => {
    render(
      <MemoryRouter>
        <SettingsIndex
          actionData={undefined}
          loaderData={getSettingsDiagnosticsLoaderData()}
          matches={matches}
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
