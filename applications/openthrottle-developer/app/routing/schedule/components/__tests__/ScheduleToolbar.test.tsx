import * as React from 'react';
import { cleanup, render, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub, useSearchParams } from 'react-router';
import { afterEach, describe, expect, test } from 'vitest';
import { SCHEDULE_COPY } from '~/routing/schedule/data/data.copy';
import { ScheduleToolbar } from '../ScheduleToolbar';
import type { ScheduleToolbarProps } from '../ScheduleToolbar';

function ScheduleToolbarWithQueryString(props: ScheduleToolbarProps) {
  const [searchParams] = useSearchParams();
  return (
    <>
      <ScheduleToolbar {...props} />
      <span data-testid="current-search">{searchParams.toString()}</span>
    </>
  );
}

function renderToolbar(initialEntry = '/'): RenderResult {
  // eslint-disable-next-line react/no-multi-comp -- test-local wrapper component
  const Component = () => <ScheduleToolbarWithQueryString />;
  const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
  return render(<RoutesStub initialEntries={[initialEntry]} />);
}

describe('ScheduleToolbar Component', () => {
  afterEach(() => {
    cleanup();
  });

  test('renders toolbar shell', () => {
    const component = renderToolbar();

    expect(component.getByTestId('ScheduleToolbar')).toBeInTheDocument();
  });

  test('renders schedule search input and Search submit button', () => {
    const component = renderToolbar();

    expect(
      component.getByRole('searchbox', { name: SCHEDULE_COPY.searchLabel }),
    ).toBeInTheDocument();
    expect(
      component.getByRole('button', { name: 'Search' }),
    ).toBeInTheDocument();
  });

  test('renders the create schedule link', () => {
    const component = renderToolbar();

    expect(
      component.getByRole('link', { name: SCHEDULE_COPY.newScheduleAction }),
    ).toHaveAttribute('href', '/schedule/create');
  });

  test('reflects search from initial search params in the search input', () => {
    const component = renderToolbar('/?search=nightly');

    expect(
      component.getByRole('searchbox', { name: SCHEDULE_COPY.searchLabel }),
    ).toHaveValue('nightly');
  });

  test('updates URL search param on search submit', async () => {
    const user = userEvent.setup();
    const component = renderToolbar();

    const input = component.getByRole('searchbox', {
      name: SCHEDULE_COPY.searchLabel,
    });
    await user.clear(input);
    await user.type(input, 'digest');
    await user.click(component.getByRole('button', { name: 'Search' }));

    await waitFor(() => {
      const qs = new URLSearchParams(
        component.getByTestId('current-search').textContent ?? '',
      );
      expect(qs.get('search')).toBe('digest');
    });
  });

  test('removes search from URL when search is cleared on submit', async () => {
    const user = userEvent.setup();
    const component = renderToolbar('/?search=old');

    const input = component.getByRole('searchbox', {
      name: SCHEDULE_COPY.searchLabel,
    });
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
