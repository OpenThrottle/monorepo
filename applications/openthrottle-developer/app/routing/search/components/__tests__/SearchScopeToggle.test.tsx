import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { createRoutesStub, useLocation } from 'react-router';
import { describe, expect, test } from 'vitest';

import { SEARCH_SCOPE_COPY } from '~/routing/search/data/copy';

import { SearchScopeToggle } from '../SearchScopeToggle';

const LocationProbe = (): React.ReactElement => {
  const location = useLocation();

  return <output data-testid="location">{location.search}</output>;
};

function renderToggle(scope: 'code' | 'knowledge', entry: string) {
  // eslint-disable-next-line react/no-multi-comp -- test-local route wrapper beside the location probe
  const Component = (): React.ReactElement => {
    return (
      <>
        <SearchScopeToggle query="settle" scope={scope} />
        <LocationProbe />
      </>
    );
  };
  const RoutesStub = createRoutesStub([{ Component, path: '/search' }]);

  return render(<RoutesStub initialEntries={[entry]} />);
}

describe('SearchScopeToggle', () => {
  test('marks the current scope as pressed', () => {
    const component = renderToggle('knowledge', '/search?q=settle');

    expect(
      component.getByRole('radio', { name: SEARCH_SCOPE_COPY.knowledge }),
    ).toHaveAttribute('aria-checked', 'true');
  });

  test('switches to code, keeping the query', async () => {
    const user = userEvent.setup();
    const component = renderToggle('knowledge', '/search?q=settle&page=3');

    await user.click(
      component.getByRole('radio', { name: SEARCH_SCOPE_COPY.code }),
    );

    const search = component.getByTestId('location').textContent ?? '';

    expect(search).toContain('scope=code');
    expect(search).toContain('q=settle');
    expect(search).not.toContain('page=');
  });

  test('switches back to knowledge, dropping the scope param', async () => {
    const user = userEvent.setup();
    const component = renderToggle('code', '/search?q=settle&scope=code');

    await user.click(
      component.getByRole('radio', { name: SEARCH_SCOPE_COPY.knowledge }),
    );

    expect(component.getByTestId('location')).toHaveTextContent('?q=settle');
  });

  test('keeps an open stats panel open', async () => {
    const user = userEvent.setup();
    const component = renderToggle('knowledge', '/search?q=settle&stats=open');

    await user.click(
      component.getByRole('radio', { name: SEARCH_SCOPE_COPY.code }),
    );

    expect(component.getByTestId('location')).toHaveTextContent('stats=open');
  });
});
