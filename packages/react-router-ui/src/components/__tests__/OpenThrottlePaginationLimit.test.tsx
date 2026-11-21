import type { RenderResult } from '@testing-library/react';
import { render, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { renderToString } from 'react-dom/server';
import {
  createMemoryRouter,
  createRoutesStub,
  RouterProvider,
  useLocation,
} from 'react-router';
import { describe, expect, test } from 'vitest';

import type { OpenThrottlePaginationLimitProps } from '../OpenThrottlePaginationLimit';
import { OpenThrottlePaginationLimit } from '../OpenThrottlePaginationLimit';

const LocationProbe = (): React.ReactElement => {
  const location = useLocation();

  return (
    <output data-testid="location">{`${location.pathname}${location.search}`}</output>
  );
};

function renderLimit(props: OpenThrottlePaginationLimitProps): RenderResult {
  // eslint-disable-next-line react/no-multi-comp -- test-local route wrapper beside the location probe
  const Component = (): React.ReactElement => {
    return (
      <>
        <OpenThrottlePaginationLimit {...props} />
        <LocationProbe />
      </>
    );
  };
  const RoutesStub = createRoutesStub([{ Component, path: '/list' }]);

  return render(<RoutesStub initialEntries={['/list?page=3&limit=10']} />);
}

describe('OpenThrottlePaginationLimit', () => {
  test('labels the select and shows the current limit', () => {
    const component = renderLimit({
      buildHref: (limit) => `/list?page=1&limit=${limit}`,
      label: 'Results per page',
      limit: 20,
      options: [10, 20, 50],
    });
    const trigger = component.getByRole('combobox', {
      name: 'Results per page',
    });

    expect(trigger).toHaveTextContent('20');
  });

  test('navigates to the href built for the chosen size', async () => {
    const user = userEvent.setup();
    const component = renderLimit({
      buildHref: (limit) => `/list?page=1&limit=${limit}`,
      label: 'Results per page',
      limit: 10,
      options: [10, 20, 50],
    });

    await user.click(component.getByRole('combobox'));
    await user.click(await component.findByRole('option', { name: '50' }));

    await waitFor(() => {
      expect(component.getByTestId('location')).toHaveTextContent(
        '/list?page=1&limit=50',
      );
    });
  });

  test('renders the current limit in the server markup', () => {
    // Radix fills a childless SelectValue only after hydration; the label must be in the SSR HTML.
    const router = createMemoryRouter(
      [
        {
          element: (
            <OpenThrottlePaginationLimit
              buildHref={(limit) => `/list?limit=${limit}`}
              label="Results per page"
              limit={50}
              options={[10, 20, 50]}
            />
          ),
          path: '/list',
        },
      ],
      { initialEntries: ['/list'] },
    );

    const html = renderToString(<RouterProvider router={router} />);

    expect(html).toContain('>50<');
  });
});
