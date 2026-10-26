import type { RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { beforeEach, describe, expect, test } from 'vitest';

import { renderWithMemoryRouter } from '~/testing/route-fixtures';
import { SearchParamsProbe } from '~/testing/SearchParamsProbe';

import { BlogPostsToolbar } from '../BlogPostsToolbar';

describe('BlogPostsToolbar Component', () => {
  let component: RenderResult;

  beforeEach(() => {
    component = renderWithMemoryRouter(
      [
        {
          element: (
            <>
              <BlogPostsToolbar />
              <SearchParamsProbe />
            </>
          ),
          path: '/',
        },
      ],
      { initialEntries: ['/?state=live&after=abc'] },
    );
  });

  test('"New post" POSTs to /blog/new', async () => {
    component.unmount();
    let created = 0;
    component = renderWithMemoryRouter(
      [
        { element: <BlogPostsToolbar />, path: '/' },
        {
          action: () => {
            created += 1;

            return null;
          },
          element: <p>creating</p>,
          path: '/blog/new',
        },
      ],
      { initialEntries: ['/'] },
    );

    const button = component.getByRole('button', { name: 'New post' });

    expect(button.closest('form')).toHaveAttribute('action', '/blog/new');

    await userEvent.setup().click(button);

    expect(await component.findByText('creating')).toBeInTheDocument();
    expect(created).toBe(1);
  });

  test('submitting a search writes q and drops the cursor', async () => {
    const user = userEvent.setup();

    await user.type(
      component.getByRole('searchbox', { name: 'Search posts' }),
      'release notes',
    );
    await user.click(component.getByRole('button', { name: 'Search' }));

    expect(component.getByTestId('search')).toHaveTextContent(
      'state=live&q=release+notes',
    );
  });

  test('submitting an empty search clears q', async () => {
    component.unmount();
    component = renderWithMemoryRouter(
      [
        {
          element: (
            <>
              <BlogPostsToolbar />
              <SearchParamsProbe />
            </>
          ),
          path: '/',
        },
      ],
      { initialEntries: ['/?q=old&state=live'] },
    );

    const user = userEvent.setup();

    await user.clear(component.getByRole('searchbox'));
    await user.click(component.getByRole('button', { name: 'Search' }));

    expect(component.getByTestId('search')).toHaveTextContent('state=live');
  });
});
