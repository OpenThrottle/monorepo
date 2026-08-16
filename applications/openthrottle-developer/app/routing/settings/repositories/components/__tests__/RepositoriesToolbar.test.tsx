import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRoutesStub, useLocation } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { REPOSITORIES_TABLE_COPY } from '~/routing/settings/repositories/data/data.copy';
import { RepositoriesToolbar } from '../RepositoriesToolbar';
import type { RepositoriesToolbarProps } from '../RepositoriesToolbar';

describe('RepositoriesToolbar Component', () => {
  let component: RenderResult;
  let props: RepositoriesToolbarProps;

  const renderToolbar = (initialEntry = '/'): RenderResult => {
    component?.unmount();
    const Component = () => (
      <>
        <RepositoriesToolbar {...props} />
        <span data-testid="SearchProbe">{useLocation().search}</span>
      </>
    );
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    return render(<RoutesStub initialEntries={[initialEntry]} />);
  };

  beforeEach(() => {
    props = {
      limit: 10,
      page: 1,
      search: '',
      sortBy: 'name',
      sortOrder: 'asc',
    };

    component = renderToolbar();
  });

  test('renders the search field and the sort control', () => {
    expect(component.getByTestId('RepositoriesToolbar')).toBeInTheDocument();
    expect(
      component.getByPlaceholderText(REPOSITORIES_TABLE_COPY.searchPlaceholder),
    ).toBeInTheDocument();
    expect(
      component.getByRole('combobox', {
        name: REPOSITORIES_TABLE_COPY.sortLabel,
      }),
    ).toBeInTheDocument();
  });

  test('writes sortBy, sortOrder and the preserved limit on a sort change', async () => {
    const user = userEvent.setup();

    await user.click(
      component.getByRole('combobox', {
        name: REPOSITORIES_TABLE_COPY.sortLabel,
      }),
    );
    await user.click(
      await component.findByRole('option', { name: 'Recently updated' }),
    );

    const search = component.getByTestId('SearchProbe').textContent ?? '';

    expect(search).toContain('sortBy=updatedAt');
    expect(search).toContain('sortOrder=desc');
    expect(search).toContain('limit=10');
  });

  test('resets paging when a search is committed', async () => {
    const user = userEvent.setup();

    component = renderToolbar('/?page=4');

    await user.type(
      component.getByPlaceholderText(REPOSITORIES_TABLE_COPY.searchPlaceholder),
      'monorepo{enter}',
    );

    const search = component.getByTestId('SearchProbe').textContent ?? '';

    expect(search).toContain('search=monorepo');
    expect(search).not.toContain('page=');
  });
});
