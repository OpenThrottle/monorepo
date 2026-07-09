import * as React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, test } from 'vitest';
import Component from '../faq._index';
import { buildRootMatch } from '~/testing/root-match-fixture';
import type { Route } from '@/app/routes/+types/faq._index';

const matches: Route.ComponentProps['matches'] = [
  buildRootMatch(),
  {
    handle: undefined,
    id: 'routes/faq._index',
    loaderData: {},
    params: {},
    pathname: '/',
  },
];

describe('routes/faq._index.tsx', () => {
  test('renders the FAQ heading and questions from docs-content', () => {
    const view = render(
      <MemoryRouter>
        <Component
          actionData={undefined}
          loaderData={{}}
          matches={matches}
          params={{}}
        />
      </MemoryRouter>,
    );

    expect(
      view.getByRole('heading', { level: 1, name: 'FAQ' }),
    ).toBeInTheDocument();
    expect(
      view.getByRole('button', { name: 'What is OpenThrottle?' }),
    ).toBeInTheDocument();
  });
});
