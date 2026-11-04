import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { describe, expect, test, vi } from 'vitest';

import type { GlobalLayoutHeaderSearchProps } from '../GlobalLayoutHeaderSearch';
import { GlobalLayoutHeaderSearch } from '../GlobalLayoutHeaderSearch';

const renderSearch = (
  overrides: Partial<GlobalLayoutHeaderSearchProps> = {},
): ReturnType<typeof render> =>
  render(
    <GlobalLayoutHeaderSearch searchPlaceholder="Search" {...overrides} />,
  );

describe('GlobalLayoutHeaderSearch Component', () => {
  test('when wired, renders the search form and a labelled icon button', () => {
    renderSearch({ onSearchChromeEvent: vi.fn() });

    expect(screen.getByTestId('GlobalLayoutHeaderSearch')).toBeInTheDocument();
    expect(screen.getByRole('searchbox')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Search' })).toBeInTheDocument();
  });

  test('icon button emits engage so the app can open the command palette', async () => {
    const user = userEvent.setup();
    const onSearchChromeEvent = vi.fn();
    renderSearch({ onSearchChromeEvent });

    await user.click(screen.getByRole('button', { name: 'Search' }));

    expect(onSearchChromeEvent).toHaveBeenCalledTimes(1);
    expect(onSearchChromeEvent).toHaveBeenCalledWith({ type: 'engage' });
  });

  test('icon button and form are only visible at their own breakpoints', () => {
    renderSearch({ onSearchChromeEvent: vi.fn() });

    expect(screen.getByRole('button', { name: 'Search' })).toHaveClass(
      'sm:hidden',
    );
    expect(screen.getByTestId('GlobalLayoutHeaderSearch')).toHaveClass(
      'hidden',
      'sm:block',
    );
  });

  test('keyboard hint is hidden on coarse pointers', () => {
    renderSearch({ onSearchChromeEvent: vi.fn() });

    const hints = screen
      .getByTestId('GlobalLayoutHeaderSearch')
      .querySelectorAll('kbd');

    expect(hints.length).toBeGreaterThan(0);
    hints.forEach((hint) => {
      expect(hint).toHaveClass('pointer-coarse:hidden');
    });
  });

  test('when unwired, renders an inert field with a coarse-hidden hint and no icon button', () => {
    renderSearch();

    expect(screen.getByRole('searchbox')).toBeInTheDocument();
    expect(screen.getByText('⌘K')).toHaveClass('pointer-coarse:hidden');
    expect(
      screen.queryByRole('button', { name: 'Search' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId('GlobalLayoutHeaderSearch'),
    ).not.toBeInTheDocument();
  });

  test('icon button and field grow to 44px on coarse pointers', () => {
    renderSearch({ onSearchChromeEvent: vi.fn() });

    expect(screen.getByRole('button', { name: 'Search' })).toHaveClass(
      'size-6',
      'pointer-coarse:size-11',
    );
    expect(screen.getByRole('searchbox')).toHaveClass('pointer-coarse:h-11');
  });
});
