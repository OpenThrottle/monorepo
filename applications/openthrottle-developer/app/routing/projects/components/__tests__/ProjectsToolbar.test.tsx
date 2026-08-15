import * as React from 'react';
import { beforeEach, describe, expect, test } from 'vitest';
import { createRoutesStub, useSearchParams } from 'react-router';
import { cleanup, render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { RenderResult } from '@testing-library/react';
import { GLOBAL_TOOLBAR_SEARCH_COPY } from '@openthrottle/react-router-ui-global';
import { ProjectsToolbar } from '../ProjectsToolbar';
import type { ProjectsToolbarProps } from '../ProjectsToolbar';

const DEFAULT_PROPS: ProjectsToolbarProps = {
  limit: 5,
  page: 1,
  search: '',
  sortBy: 'name',
  sortOrder: 'asc',
  view: 'table',
};

function renderToolbar(
  props: ProjectsToolbarProps,
  initialEntries: string[] = ['/'],
): { component: RenderResult; search: { current: URLSearchParams } } {
  const search: { current: URLSearchParams } = {
    current: new URLSearchParams(),
  };

  function ToolbarProbe(): React.ReactElement {
    const [searchParams] = useSearchParams();
    search.current = searchParams;
    return <ProjectsToolbar {...props} />;
  }

  const RoutesStub = createRoutesStub([{ Component: ToolbarProbe, path: '/' }]);
  const component = render(<RoutesStub initialEntries={initialEntries} />);
  return { component, search };
}

describe('ProjectsToolbar Component', () => {
  let component: RenderResult;
  let props: ProjectsToolbarProps;

  beforeEach(() => {
    props = { ...DEFAULT_PROPS };
    ({ component } = renderToolbar(props));
  });

  test('should render toolbar shell with data-testid', () => {
    expect(component.getByTestId('ProjectsToolbar')).toBeInTheDocument();
  });

  test('should render the GlobalToolbarSearch control', () => {
    // The shared control owns its own form role=search + labeled searchbox.
    expect(component.getByRole('search')).toBeInTheDocument();
    const input = component.getByRole('searchbox', {
      name: /search projects/i,
    });
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute('placeholder', 'Search projects...');
    expect(
      component.getByRole('button', {
        name: GLOBAL_TOOLBAR_SEARCH_COPY.buttonLabel,
      }),
    ).toBeInTheDocument();
  });

  test('should render single sort dropdown', () => {
    const sortDropdown = component.getByRole('combobox', {
      name: /sort projects/i,
    });
    expect(sortDropdown).toBeInTheDocument();
  });

  test('submitting a search sets `search` and resets `page`', async () => {
    // Drop the beforeEach render so only this test's harness is mounted.
    cleanup();
    const user = userEvent.setup();
    const { component: harness, search } = renderToolbar(props, [
      '/?page=3&limit=5',
    ]);

    const input = harness.getByRole('searchbox', {
      name: /search projects/i,
    });
    await user.type(input, 'widgets');
    await user.click(
      harness.getByRole('button', {
        name: GLOBAL_TOOLBAR_SEARCH_COPY.buttonLabel,
      }),
    );

    expect(search.current.get('search')).toBe('widgets');
    expect(search.current.has('page')).toBe(false);
    expect(search.current.has('q')).toBe(false);
  });
});
