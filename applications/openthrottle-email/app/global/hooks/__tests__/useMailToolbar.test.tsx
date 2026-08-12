import * as React from 'react';
import { act, fireEvent, render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { useMailToolbar } from '../useMailToolbar';

const navigateMock = vi.fn();

vi.mock('react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router')>();
  return { ...actual, useNavigate: () => navigateMock };
});

/** Test-only harness rendering the hook's search input and breadcrumb so we
 * can drive real DOM events instead of fabricating synthetic event objects. */
const Harness = (): React.ReactElement => {
  const { breadcrumb, handleSearchChange, inputValue } = useMailToolbar();
  return (
    <div>
      <span data-testid="breadcrumb">{JSON.stringify(breadcrumb)}</span>
      <input
        data-testid="search-input"
        onChange={handleSearchChange}
        value={inputValue}
      />
    </div>
  );
};

const renderAt = (initialEntry: string): RenderResult =>
  render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Harness />
    </MemoryRouter>,
  );

describe('useMailToolbar', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    navigateMock.mockClear();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  test('derives the breadcrumb from the current pathname', () => {
    const component = renderAt('/mail/sent');

    expect(component.getByTestId('breadcrumb')).toHaveTextContent(
      JSON.stringify({ href: '/mail/sent', page: 'Sent' }),
    );
  });

  test('syncs inputValue from the URL query when on the search page', () => {
    const component = renderAt('/mail/search?q=invoice');

    expect(component.getByTestId('search-input')).toHaveValue('invoice');
    expect(component.getByTestId('breadcrumb')).toHaveTextContent(
      JSON.stringify({ href: '/mail/search', page: 'Search' }),
    );
  });

  test('debounces navigation to the search route while typing', () => {
    const component = renderAt('/mail/search');
    const input = component.getByTestId('search-input');

    act(() => {
      fireEvent.change(input, { target: { value: 'hello' } });
    });

    expect(input).toHaveValue('hello');
    expect(navigateMock).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(navigateMock).toHaveBeenCalledWith('/mail/search?q=hello', {
      replace: true,
      viewTransition: true,
    });
  });

  test('does not schedule a navigate when not on the search page', () => {
    const component = renderAt('/mail/');
    const input = component.getByTestId('search-input');

    act(() => {
      fireEvent.change(input, { target: { value: 'hello' } });
    });

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(navigateMock).not.toHaveBeenCalled();
  });
});
