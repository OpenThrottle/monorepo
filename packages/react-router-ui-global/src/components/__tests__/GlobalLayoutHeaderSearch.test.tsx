import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { describe, expect, test, vi } from 'vitest';

import type { GlobalLayoutHeaderSearchProps } from '../GlobalLayoutHeaderSearch';
import { GlobalLayoutHeaderSearch } from '../GlobalLayoutHeaderSearch';

const renderSearch = (
  overrides: Partial<GlobalLayoutHeaderSearchProps> = {},
): ReturnType<typeof render> => {
  return render(
    <GlobalLayoutHeaderSearch searchPlaceholder="Search" {...overrides} />,
  );
};

describe('GlobalLayoutHeaderSearch Component', () => {
  test('when wired, renders the search form and a labelled icon button', () => {
    const component = renderSearch({ onSearchChromeEvent: vi.fn() });

    expect(
      component.getByTestId('GlobalLayoutHeaderSearch'),
    ).toBeInTheDocument();
    expect(component.getByRole('searchbox')).toBeInTheDocument();
    expect(
      component.getByRole('button', { name: 'Search' }),
    ).toBeInTheDocument();
  });

  test('icon button emits engage so the app can open the command palette', async () => {
    const user = userEvent.setup();
    const onSearchChromeEvent = vi.fn();
    const component = renderSearch({ onSearchChromeEvent });

    await user.click(component.getByRole('button', { name: 'Search' }));

    expect(onSearchChromeEvent).toHaveBeenCalledTimes(1);
    expect(onSearchChromeEvent).toHaveBeenCalledWith({ type: 'engage' });
  });

  test('icon button and form are only visible at their own breakpoints', () => {
    const component = renderSearch({ onSearchChromeEvent: vi.fn() });

    expect(component.getByRole('button', { name: 'Search' })).toHaveClass(
      'sm:hidden',
    );
    expect(component.getByTestId('GlobalLayoutHeaderSearch')).toHaveClass(
      'hidden',
      'sm:block',
    );
  });

  test('keyboard hint is hidden on coarse pointers', () => {
    const component = renderSearch({ onSearchChromeEvent: vi.fn() });

    const hints = component
      .getByTestId('GlobalLayoutHeaderSearch')
      .querySelectorAll('kbd');

    expect(hints.length).toBeGreaterThan(0);
    hints.forEach((hint) => {
      expect(hint).toHaveClass('pointer-coarse:hidden');
    });
  });

  test('when unwired, renders an inert field with a coarse-hidden hint and no icon button', () => {
    const component = renderSearch();

    expect(component.getByRole('searchbox')).toBeInTheDocument();
    expect(component.getByText('⌘K')).toHaveClass('pointer-coarse:hidden');
    expect(
      component.queryByRole('button', { name: 'Search' }),
    ).not.toBeInTheDocument();
    expect(
      component.queryByTestId('GlobalLayoutHeaderSearch'),
    ).not.toBeInTheDocument();
  });

  test('icon button and field grow to 44px on coarse pointers', () => {
    const component = renderSearch({ onSearchChromeEvent: vi.fn() });

    expect(component.getByRole('button', { name: 'Search' })).toHaveClass(
      'size-6',
      'pointer-coarse:size-11',
    );
    expect(component.getByRole('searchbox')).toHaveClass('pointer-coarse:h-11');
  });
});
