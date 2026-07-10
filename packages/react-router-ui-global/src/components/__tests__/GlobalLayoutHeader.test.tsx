import * as React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRoutesStub } from 'react-router';
import { describe, expect, test, vi } from 'vitest';
import { GlobalLayoutHeader } from '../GlobalLayoutHeader';
import type { GlobalLayoutHeaderProps } from '../GlobalLayoutHeader';
import { GlobalProviders } from '../GlobalProviders';

/**
 * @description Advance tab focus until `element` is focused or the tab budget is exhausted.
 */
const tabUntilFocused = async (
  user: ReturnType<typeof userEvent.setup>,
  element: HTMLElement,
  maxTabs: number,
): Promise<void> => {
  if (maxTabs <= 0 || document.activeElement === element) {
    return;
  }
  await user.tab();
  await tabUntilFocused(user, element, maxTabs - 1);
};

const renderHeader = (
  headerProps: GlobalLayoutHeaderProps = {},
): ReturnType<typeof render> => {
  const Component = (): React.ReactElement => (
    <GlobalProviders>
      <GlobalLayoutHeader {...headerProps} />
    </GlobalProviders>
  );
  const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
  return render(<RoutesStub />);
};

describe('GlobalLayoutHeader Component', () => {
  test('renders navigation chrome and inert search field by default', () => {
    renderHeader({});
    expect(
      screen.getByRole('button', { name: /toggle sidebar/i }),
    ).toBeInTheDocument();
    expect(screen.getByTestId('OpenThrottleBreadcrumbs')).toBeInTheDocument();
    expect(screen.getByRole('searchbox')).toBeInTheDocument();
  });

  test('when search is unwired, omits search form wrapper', () => {
    renderHeader({});
    expect(
      screen.queryByTestId('GlobalLayoutHeaderSearch'),
    ).not.toBeInTheDocument();
  });
});

describe('GlobalLayoutHeader search chrome', () => {
  test('focus emits engage once wired', async () => {
    const user = userEvent.setup();
    const onSearchChromeEvent = vi.fn();
    renderHeader({ onSearchChromeEvent });

    const field = screen.getByRole('searchbox');
    await user.click(field);

    expect(onSearchChromeEvent).toHaveBeenCalledWith({ type: 'engage' });
  });

  test('focus via keyboard Tab emits engage', async () => {
    const user = userEvent.setup();
    const onSearchChromeEvent = vi.fn();
    renderHeader({ onSearchChromeEvent });

    const field = screen.getByRole('searchbox');
    await tabUntilFocused(user, field, 30);

    expect(field).toHaveFocus();
    expect(onSearchChromeEvent).toHaveBeenCalledWith({ type: 'engage' });
  });

  test('submit emits submit with trimmed query when non-empty', async () => {
    const user = userEvent.setup();
    const onSearchChromeEvent = vi.fn();
    renderHeader({ onSearchChromeEvent });

    const field = screen.getByRole('searchbox');
    await user.type(field, '  hello world  ');
    await user.keyboard('{Enter}');

    expect(onSearchChromeEvent).toHaveBeenLastCalledWith({
      query: 'hello world',
      type: 'submit',
    });
  });

  test('submit with empty draft does not emit submit', async () => {
    const user = userEvent.setup();
    const onSearchChromeEvent = vi.fn();
    renderHeader({ onSearchChromeEvent });

    const field = screen.getByRole('searchbox');
    await user.click(field);
    await user.keyboard('{Enter}');

    expect(onSearchChromeEvent).toHaveBeenCalledTimes(1);
    expect(onSearchChromeEvent).toHaveBeenCalledWith({ type: 'engage' });
  });

  test('controlled searchValue defers draft to parent', async () => {
    const user = userEvent.setup();
    const onSearchChromeEvent = vi.fn();

    // eslint-disable-next-line react/no-multi-comp -- test-local harness component
    const ControlledHarness = (): React.ReactElement => {
      const [value, setValue] = React.useState('seed');
      return (
        <GlobalProviders>
          <GlobalLayoutHeader
            onSearchChromeEvent={onSearchChromeEvent}
            onSearchValueChange={setValue}
            searchValue={value}
          />
        </GlobalProviders>
      );
    };

    const RoutesStub = createRoutesStub([
      { Component: ControlledHarness, path: '/' },
    ]);
    render(<RoutesStub />);

    const field = screen.getByRole('searchbox');
    expect(field).toHaveValue('seed');

    await user.type(field, 'x');
    expect(field).toHaveValue('seedx');
  });
});
