import type { RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { beforeEach, describe, expect, test } from 'vitest';

import { BlogPostState } from '~/__generated__/graphql';
import { renderWithMemoryRouter } from '~/testing/route-fixtures';
import { SearchParamsProbe } from '~/testing/SearchParamsProbe';

import type { BlogPostStateTabsProps } from '../BlogPostStateTabs';
import { BlogPostStateTabs } from '../BlogPostStateTabs';

const renderTabs = (props: BlogPostStateTabsProps, url: string): RenderResult =>
  renderWithMemoryRouter(
    [
      {
        element: (
          <>
            <BlogPostStateTabs {...props} />
            <SearchParamsProbe />
          </>
        ),
        path: '/',
      },
    ],
    { initialEntries: [url] },
  );

describe('BlogPostStateTabs Component', () => {
  let component: RenderResult;
  let props: BlogPostStateTabsProps;

  beforeEach(() => {
    props = { state: BlogPostState.Draft };
    component = renderTabs(props, '/');
  });

  test('renders Drafts, Scheduled, Live and Archived tabs in order', () => {
    expect(component.getAllByRole('tab').map((tab) => tab.textContent)).toEqual(
      ['Drafts', 'Scheduled', 'Live', 'Archived'],
    );
  });

  test('marks the active state tab as selected', () => {
    expect(component.getByRole('tab', { name: 'Drafts' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });

  test('switching tabs writes the state param', async () => {
    const user = userEvent.setup();

    await user.click(component.getByRole('tab', { name: 'Scheduled' }));

    expect(component.getByTestId('search')).toHaveTextContent(
      'state=scheduled',
    );
  });

  test('switching tabs keeps the search and drops the cursor', async () => {
    component.unmount();
    component = renderTabs(props, '/?q=launch&after=abc&state=draft');

    const user = userEvent.setup();

    await user.click(component.getByRole('tab', { name: 'Live' }));

    expect(component.getByTestId('search')).toHaveTextContent(
      'q=launch&state=live',
    );
  });
});
