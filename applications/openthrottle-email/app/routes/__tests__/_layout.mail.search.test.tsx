import * as React from 'react';
import { render } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { createTestEnv } from '@openthrottle/react-router-testing';
import { createRoutesStub } from 'react-router';
import { default as Route } from '../_layout.mail.search';
import type { Route as RouteTypes } from '@/app/routes/+types/_layout.mail.search';

// The real ancestor chain for this route: root -> _layout.mail (pathless
// layout) -> _layout.mail.search. matches is unused by the component under
// test, but its type is a fixed tuple keyed to that chain, so it's built
// out fully rather than stubbed.
const matches: RouteTypes.ComponentProps['matches'] = [
  {
    handle: undefined,
    id: 'root',
    loaderData: {
      canonical: 'http://localhost/',
      env: createTestEnv({ APP_NAME: 'openthrottle-email' }),
    },
    params: {},
    pathname: '/',
  },
  {
    handle: undefined,
    id: 'routes/_layout.mail',
    loaderData: { defaultSidebarOpen: true },
    params: {},
    pathname: '/mail',
  },
  {
    handle: undefined,
    id: 'routes/_layout.mail.search',
    loaderData: { messages: [], query: 'test query' },
    params: {},
    pathname: '/mail/search',
  },
];

describe('routes/_layout.mail.search.tsx', () => {
  test('should render search route with empty state when no query', () => {
    const RoutesStub = createRoutesStub([{ Component: Route, path: '/' }]);

    const component = render(<RoutesStub />);
    // const component = render(
    //   <MailSearchRoute loaderData={{ messages: [], query: '' }} />,
    // );

    expect(component.getByTestId('MailSearchRoute')).toBeInTheDocument();
    expect(
      component.getByTestId('MailSearchRoute-empty-no-query'),
    ).toBeInTheDocument();
    expect(component.getByText('Search mail')).toBeInTheDocument();
    expect(
      component.getByText(/Enter a search term in the toolbar above/),
    ).toBeInTheDocument();
  });

  test('should show search results heading and no-results empty state when query has no matches', () => {
    const Component = () => (
      <Route
        actionData={undefined}
        loaderData={{ messages: [], query: 'test query' }}
        matches={matches}
        params={{}}
      />
    );
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    const component = render(<RoutesStub />);

    expect(
      component.getByText(/Search results for "test query"/),
    ).toBeInTheDocument();
    expect(
      component.getByTestId('MailSearchRoute-empty-no-results'),
    ).toBeInTheDocument();
    expect(component.getByText('No results')).toBeInTheDocument();
  });
});
