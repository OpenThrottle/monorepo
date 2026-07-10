import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, test } from 'vitest';
import { OPENTHROTTLE_CONTACT_EMAIL } from '@openthrottle/react-router-utils';
import { buildRootMatch } from '~/testing/root-match-fixture';
import ProfileIndex from '../profile._index';
import type { Route } from '@/app/routes/+types/profile._index';

const matches: Route.ComponentProps['matches'] = [
  buildRootMatch(),
  {
    handle: undefined,
    id: 'routes/profile._index',
    loaderData: {},
    params: {},
    pathname: '/',
  },
];

describe('routes/profile._index.tsx', () => {
  test('renders profile name and contact email', () => {
    render(
      <MemoryRouter>
        <ProfileIndex
          actionData={undefined}
          loaderData={{}}
          matches={matches}
          params={{}}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText('Matthew Scholta')).toBeInTheDocument();
    expect(screen.getByText(OPENTHROTTLE_CONTACT_EMAIL)).toBeInTheDocument();
  });
});
