import { render } from '@testing-library/react';
import * as React from 'react';
import { MemoryRouter } from 'react-router';
import { describe, expect, test } from 'vitest';

import type { Route } from '@/app/routes/+types/legal.privacy-policy';
import { buildRootMatch } from '~/testing/root-match-fixture';

import PrivacyPolicy from '../legal.privacy-policy';

const matches: Route.ComponentProps['matches'] = [
  buildRootMatch(),
  {
    handle: undefined,
    id: 'routes/legal.privacy-policy',
    loaderData: {},
    params: {},
    pathname: '/',
  },
];

describe('routes/legal.privacy-policy.tsx', () => {
  test('should render privacy policy heading', () => {
    const view = render(
      <MemoryRouter>
        <PrivacyPolicy
          actionData={undefined}
          loaderData={{}}
          matches={matches}
          params={{}}
        />
      </MemoryRouter>,
    );

    expect(
      view.getByRole('heading', { level: 1, name: 'Privacy policy' }),
    ).toBeInTheDocument();
  });
});
