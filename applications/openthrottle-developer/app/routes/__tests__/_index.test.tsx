import * as React from 'react';
import { describe, expect, test } from 'vitest';
import { renderRoutesStub } from '~/testing/route-fixtures';
import { buildRootMatch } from '~/testing/root-match-fixture';
import Index from '../_index';
import type { Route } from '@/app/routes/+types/_index';

const matches: Route.ComponentProps['matches'] = [
  buildRootMatch(),
  {
    handle: undefined,
    id: 'routes/_index',
    loaderData: { models: [], personas: [], repositories: [] },
    params: {},
    pathname: '/',
  },
];

describe('routes/_index.tsx', () => {
  test('renders home build prompt heading', () => {
    const view = renderRoutesStub(
      <Index
        actionData={undefined}
        loaderData={{ models: [], personas: [], repositories: [] }}
        matches={matches}
        params={{}}
      />,
    );

    expect(
      view.getByText('What would you like to build today?'),
    ).toBeInTheDocument();
  });
});
