import { render } from '@testing-library/react';
import * as React from 'react';
import { MemoryRouter } from 'react-router';
import { describe, expect, test } from 'vitest';

import { getSettingsDiagnosticsLoaderData } from '~/routing/settings/utils/getSettingsDiagnosticsLoaderData';

import SettingsApplication from '../settings.application';

function stubMatches(): React.ComponentProps<
  typeof SettingsApplication
>['matches'];
function stubMatches(): unknown {
  return [];
}

describe('routes/settings.application.tsx', () => {
  test('should render', () => {
    const component = render(
      <MemoryRouter>
        <SettingsApplication
          actionData={undefined}
          loaderData={getSettingsDiagnosticsLoaderData()}
          matches={stubMatches()}
          params={{}}
        />
      </MemoryRouter>,
    );

    expect(
      component.getByRole('heading', { name: 'Application' }),
    ).toBeInTheDocument();
  });
});
