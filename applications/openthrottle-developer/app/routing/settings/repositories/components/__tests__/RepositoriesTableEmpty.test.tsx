import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRoutesStub, useLocation } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { REPOSITORIES_TABLE_COPY } from '~/routing/settings/repositories/data/data.copy';
import { RepositoriesTableEmpty } from '../RepositoriesTableEmpty';
import type { RepositoriesTableEmptyProps } from '../RepositoriesTableEmpty';

describe('RepositoriesTableEmpty Component', () => {
  let component: RenderResult;
  let props: RepositoriesTableEmptyProps;

  const renderEmpty = (initialEntry: string): RenderResult => {
    component?.unmount();
    const Component = () => (
      <>
        <RepositoriesTableEmpty {...props} />
        <span data-testid="SearchProbe">{useLocation().search}</span>
      </>
    );
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    return render(<RoutesStub initialEntries={[initialEntry]} />);
  };

  beforeEach(() => {
    props = {};

    component = renderEmpty('/?search=nothing&page=3');
  });

  test('renders the no-results message and a clear-search affordance', () => {
    expect(component.getByTestId('RepositoriesTableEmpty')).toBeInTheDocument();
    expect(
      component.getByText(REPOSITORIES_TABLE_COPY.noResults),
    ).toBeInTheDocument();
    expect(
      component.getByRole('button', {
        name: REPOSITORIES_TABLE_COPY.clearSearch,
      }),
    ).toBeInTheDocument();
  });

  test('clears the search and page params when the button is pressed', async () => {
    const user = userEvent.setup();

    await user.click(
      component.getByRole('button', {
        name: REPOSITORIES_TABLE_COPY.clearSearch,
      }),
    );

    const probe = component.getByTestId('SearchProbe');

    expect(probe.textContent).not.toContain('search=');
    expect(probe.textContent).not.toContain('page=');
  });
});
