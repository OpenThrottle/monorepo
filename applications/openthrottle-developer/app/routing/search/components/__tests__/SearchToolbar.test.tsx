import { TooltipProvider } from '@openthrottle/react-router-shadcn';
import type { RenderResult } from '@testing-library/react';
import { render, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { createRoutesStub, useLocation } from 'react-router';
import { describe, expect, test } from 'vitest';

import { SEARCH_TOOLBAR_COPY } from '~/routing/search/data/copy';

import type { SearchToolbarProps } from '../SearchToolbar';
import { SearchToolbar } from '../SearchToolbar';

const LocationProbe = (): React.ReactElement => {
  const location = useLocation();

  return <output data-testid="location">{location.search}</output>;
};

function renderToolbar(
  props: SearchToolbarProps,
  initialEntry = '/search',
): RenderResult {
  // eslint-disable-next-line react/no-multi-comp -- test-local route wrapper beside the location probe
  const Component = (): React.ReactElement => {
    return (
      <TooltipProvider>
        <SearchToolbar {...props} />
        <LocationProbe />
      </TooltipProvider>
    );
  };
  const RoutesStub = createRoutesStub([{ Component, path: '/search' }]);

  return render(<RoutesStub initialEntries={[initialEntry]} />);
}

describe('SearchToolbar', () => {
  test('renders a GET search form to /search with the query pre-filled', () => {
    const component = renderToolbar({
      defaultQuery: 'cms api',
      expandRankingDetails: false,
    });
    const form = component.getByTestId('SearchToolbar-form');
    const input = component.getByRole('searchbox', {
      name: SEARCH_TOOLBAR_COPY.queryLabel,
    });

    expect(form).toHaveAttribute('method', 'get');
    expect(form).toHaveAttribute('action', '/search');
    expect(input).toHaveAttribute('name', 'q');
    expect(input).toHaveValue('cms api');
  });

  test('carries details=ranking on new searches only when ranking details are on', () => {
    const on = renderToolbar({ defaultQuery: 'x', expandRankingDetails: true });

    expect(
      on.container.querySelector('input[name="details"][value="ranking"]'),
    ).not.toBeNull();
    on.unmount();

    const off = renderToolbar({
      defaultQuery: 'x',
      expandRankingDetails: false,
    });

    expect(off.container.querySelector('input[name="details"]')).toBeNull();
  });

  test('turning ranking details on writes details=ranking to the URL', async () => {
    const user = userEvent.setup();
    const component = renderToolbar(
      { defaultQuery: 'cms', expandRankingDetails: false },
      '/search?q=cms',
    );

    await user.click(component.getByTestId('SearchToolbar-ranking'));

    await waitFor(() => {
      expect(component.getByTestId('location')).toHaveTextContent(
        'details=ranking',
      );
    });
  });

  test('turning ranking details off removes details from the URL', async () => {
    const user = userEvent.setup();
    const component = renderToolbar(
      { defaultQuery: 'cms', expandRankingDetails: true },
      '/search?q=cms&details=ranking',
    );

    await user.click(component.getByTestId('SearchToolbar-ranking'));

    await waitFor(() => {
      expect(component.getByTestId('location')).not.toHaveTextContent(
        'details',
      );
    });
  });

  test('disables the ranking switch until there is a query', () => {
    const component = renderToolbar({
      defaultQuery: '',
      expandRankingDetails: false,
    });

    expect(component.getByTestId('SearchToolbar-ranking')).toBeDisabled();
  });

  test('renders slot children', () => {
    const component = renderToolbar({
      children: <span data-testid="slot">filter</span>,
      defaultQuery: '',
      expandRankingDetails: false,
    });

    expect(component.getByTestId('slot')).toBeInTheDocument();
  });
});
