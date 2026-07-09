import * as React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, test } from 'vitest';
import { buildRootMatch } from '~/testing/root-match-fixture';
import LegalIndex from '../legal._index';
import type { Route } from '@/app/routes/+types/legal._index';

const matches: Route.ComponentProps['matches'] = [
  buildRootMatch(),
  {
    handle: undefined,
    id: 'routes/legal._index',
    loaderData: {},
    params: {},
    pathname: '/',
  },
];

describe('routes/legal._index.tsx', () => {
  test('renders legal heading and policy links', () => {
    const view = render(
      <MemoryRouter>
        <LegalIndex
          actionData={undefined}
          loaderData={{}}
          matches={matches}
          params={{}}
        />
      </MemoryRouter>,
    );

    expect(
      view.getByRole('heading', { level: 1, name: 'Legal' }),
    ).toBeInTheDocument();
    expect(view.getByRole('link', { name: 'License' })).toHaveAttribute(
      'href',
      '/legal/license',
    );
    expect(view.getByRole('link', { name: 'Privacy policy' })).toHaveAttribute(
      'href',
      '/legal/privacy-policy',
    );
    expect(view.getByRole('link', { name: 'Terms of use' })).toHaveAttribute(
      'href',
      '/legal/terms-of-use',
    );
  });
});
