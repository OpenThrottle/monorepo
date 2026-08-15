import * as React from 'react';
import { cleanup, render, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub, useSearchParams } from 'react-router';
import { afterEach, describe, expect, test } from 'vitest';
import { NotesToolbar } from '../NotesToolbar';
import type { NotesToolbarProps } from '../NotesToolbar';

function NotesToolbarWithQueryString(props: NotesToolbarProps) {
  const [searchParams] = useSearchParams();
  return (
    <>
      <NotesToolbar {...props} />
      <span data-testid="current-search">{searchParams.toString()}</span>
    </>
  );
}

function renderToolbar(
  initialEntry = '/',
): RenderResult & { RoutesStub: ReturnType<typeof createRoutesStub> } {
  // eslint-disable-next-line react/no-multi-comp -- test-local wrapper component
  const Component = () => <NotesToolbarWithQueryString />;
  const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
  const view = render(<RoutesStub initialEntries={[initialEntry]} />);
  return { ...view, RoutesStub };
}

describe('NotesToolbar Component', () => {
  afterEach(() => {
    cleanup();
  });

  test('renders toolbar shell', () => {
    const component = renderToolbar();

    expect(component.getByTestId('NotesToolbar')).toBeInTheDocument();
  });

  test('renders notes search input and Search submit button', () => {
    const component = renderToolbar();

    expect(
      component.getByRole('searchbox', { name: /search notes/i }),
    ).toBeInTheDocument();
    expect(
      component.getByRole('button', { name: 'Search' }),
    ).toBeInTheDocument();
  });

  test('renders Create note link', () => {
    const component = renderToolbar();

    expect(
      component.getByRole('link', { name: /create note/i }),
    ).toHaveAttribute('href', '/notes/create');
  });

  test('reflects search from initial search params in the search input', () => {
    const component = renderToolbar('/?search=hello');

    expect(
      component.getByRole('searchbox', { name: /search notes/i }),
    ).toHaveValue('hello');
  });

  test('updates URL search param on search submit', async () => {
    const user = userEvent.setup();
    const component = renderToolbar();

    const input = component.getByRole('searchbox', { name: /search notes/i });
    await user.clear(input);
    await user.type(input, 'draft');
    await user.click(component.getByRole('button', { name: 'Search' }));

    await waitFor(() => {
      const qs = new URLSearchParams(
        component.getByTestId('current-search').textContent ?? '',
      );
      expect(qs.get('search')).toBe('draft');
    });
  });

  test('removes search from URL when search is cleared on submit', async () => {
    const user = userEvent.setup();
    const component = renderToolbar('/?search=old');

    const input = component.getByRole('searchbox', { name: /search notes/i });
    await user.clear(input);
    await user.click(component.getByRole('button', { name: 'Search' }));

    await waitFor(() => {
      const qs = new URLSearchParams(
        component.getByTestId('current-search').textContent ?? '',
      );
      expect(qs.has('search')).toBe(false);
    });
  });
});
