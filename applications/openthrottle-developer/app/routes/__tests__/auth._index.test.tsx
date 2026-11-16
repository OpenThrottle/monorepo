import * as React from 'react';
import { describe, expect, test } from 'vitest';

import type { Route } from '@/app/routes/+types/auth._index';
import { buildRootMatch } from '~/testing/buildRootMatch';
import { renderRoutesStub } from '~/testing/route-fixtures';

import AuthIndex from '../auth._index';

const matches: Route.ComponentProps['matches'] = [
  buildRootMatch(),
  {
    handle: undefined,
    id: 'routes/auth._index',
    loaderData: { redirectTo: '/dashboard' },
    params: {},
    pathname: '/auth',
  },
];

describe('routes/auth._index.tsx', () => {
  test('renders sign-in form', () => {
    const component = renderRoutesStub(
      <AuthIndex
        actionData={undefined}
        loaderData={{ redirectTo: '/dashboard' }}
        matches={matches}
        params={{}}
      />,
    );

    expect(
      component.getByRole('button', { name: 'Sign in' }),
    ).toBeInTheDocument();
    expect(component.getByLabelText('Email')).toBeInTheDocument();
  });
});
