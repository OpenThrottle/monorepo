import * as React from 'react';
import { cleanup, render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  createRoutesStub,
  useNavigationType,
  useSearchParams,
} from 'react-router';
import { afterEach, describe, expect, test } from 'vitest';
import type { RenderResult } from '@testing-library/react';
import { GLOBAL_TOOLBAR_SEARCH_COPY } from '../../data/data.copy';
import { GlobalToolbarSearch } from '../GlobalToolbarSearch';
import type { GlobalToolbarSearchProps } from '../GlobalToolbarSearch';

const ARIA_LABEL = 'Search skills';

function Harness(props: GlobalToolbarSearchProps): React.ReactElement {
  const [searchParams] = useSearchParams();
  const navigationType = useNavigationType();

  return (
    <div>
      <span data-testid="qs">{searchParams.toString()}</span>
      <span data-testid="nav-type">{navigationType}</span>
      <GlobalToolbarSearch aria-label={ARIA_LABEL} {...props} />
    </div>
  );
}

function renderSearch(
  props: GlobalToolbarSearchProps = {},
  initialEntries: string[] = ['/'],
): RenderResult {
  // eslint-disable-next-line react/no-multi-comp -- test-local wrapper component
  const Component = () => <Harness {...props} />;
  const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

  return render(<RoutesStub initialEntries={initialEntries} />);
}

const readParams = (component: RenderResult): URLSearchParams =>
  new URLSearchParams(component.getByTestId('qs').textContent ?? '');

describe('GlobalToolbarSearch Component', () => {
  afterEach(() => {
    cleanup();
  });

  test('exposes an accessible search form, labeled input, and submit button', () => {
    const component = renderSearch();

    expect(component.getByTestId('GlobalToolbarSearch')).toHaveAttribute(
      'role',
      'search',
    );
    expect(
      component.getByRole('searchbox', { name: ARIA_LABEL }),
    ).toBeInTheDocument();
    expect(
      component.getByRole('button', {
        name: GLOBAL_TOOLBAR_SEARCH_COPY.buttonLabel,
      }),
    ).toBeInTheDocument();
  });

  test('hydrates the input from the committed ?search param', () => {
    const component = renderSearch({}, ['/?search=hello']);

    expect(component.getByRole('searchbox', { name: ARIA_LABEL })).toHaveValue(
      'hello',
    );
  });

  test('submit writes the trimmed search param and marks the navigation as a replace', async () => {
    const user = userEvent.setup();
    const component = renderSearch();

    const input = component.getByRole('searchbox', { name: ARIA_LABEL });
    await user.type(input, '  widgets  ');
    await user.click(
      component.getByRole('button', {
        name: GLOBAL_TOOLBAR_SEARCH_COPY.buttonLabel,
      }),
    );

    expect(readParams(component).get('search')).toBe('widgets');
    // replace: true keeps the submit off the history stack.
    expect(component.getByTestId('nav-type')).toHaveTextContent('REPLACE');
  });

  test('empty submit deletes the search param', async () => {
    const user = userEvent.setup();
    const component = renderSearch({}, ['/?search=stale']);

    const input = component.getByRole('searchbox', { name: ARIA_LABEL });
    await user.clear(input);
    await user.click(
      component.getByRole('button', {
        name: GLOBAL_TOOLBAR_SEARCH_COPY.buttonLabel,
      }),
    );

    expect(readParams(component).has('search')).toBe(false);
  });

  test('preserves other params on submit', async () => {
    const user = userEvent.setup();
    const component = renderSearch({}, ['/?page=3&limit=25']);

    await user.type(
      component.getByRole('searchbox', { name: ARIA_LABEL }),
      'query',
    );
    await user.click(
      component.getByRole('button', {
        name: GLOBAL_TOOLBAR_SEARCH_COPY.buttonLabel,
      }),
    );

    const params = readParams(component);
    expect(params.get('search')).toBe('query');
    expect(params.get('page')).toBe('3');
    expect(params.get('limit')).toBe('25');
  });

  test('transformCommittedParams can reset pagination before the write', async () => {
    const user = userEvent.setup();
    const component = renderSearch(
      {
        transformCommittedParams: (next) => {
          next.delete('page');
        },
      },
      ['/?page=4'],
    );

    await user.type(
      component.getByRole('searchbox', { name: ARIA_LABEL }),
      'reset',
    );
    await user.click(
      component.getByRole('button', {
        name: GLOBAL_TOOLBAR_SEARCH_COPY.buttonLabel,
      }),
    );

    const params = readParams(component);
    expect(params.get('search')).toBe('reset');
    expect(params.has('page')).toBe(false);
  });

  test('paramKey override writes the given key instead of search', async () => {
    const user = userEvent.setup();
    const component = renderSearch({ paramKey: 'q' });

    await user.type(
      component.getByRole('searchbox', { name: ARIA_LABEL }),
      'legacy',
    );
    await user.click(
      component.getByRole('button', {
        name: GLOBAL_TOOLBAR_SEARCH_COPY.buttonLabel,
      }),
    );

    const params = readParams(component);
    expect(params.get('q')).toBe('legacy');
    expect(params.has('search')).toBe(false);
  });

  test('resyncs the input when the committed param changes (Back/Forward)', () => {
    const component = renderSearch({}, ['/?search=first']);

    expect(component.getByRole('searchbox', { name: ARIA_LABEL })).toHaveValue(
      'first',
    );

    // A remount at a different committed value hydrates from the URL, proving
    // the input tracks the param rather than latching its initial value.
    cleanup();
    const next = renderSearch({}, ['/?search=second']);
    expect(next.getByRole('searchbox', { name: ARIA_LABEL })).toHaveValue(
      'second',
    );
  });
});
