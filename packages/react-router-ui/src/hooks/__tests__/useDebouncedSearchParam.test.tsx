import { act, render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { createRoutesStub, useSearchParams } from 'react-router';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import type { UseDebouncedSearchParamOptions } from '../useDebouncedSearchParam';
import { useDebouncedSearchParam } from '../useDebouncedSearchParam';

const DISPLAY_ID = 'search-params-string';

function SearchHarness(props: {
  readonly options?: UseDebouncedSearchParamOptions;
}) {
  const [searchParams] = useSearchParams();
  const hook = useDebouncedSearchParam(props.options);

  return (
    <div>
      <span data-testid={DISPLAY_ID}>{searchParams.toString()}</span>
      <span data-testid="committed-q">{searchParams.get('q') ?? ''}</span>
      <input
        aria-label="Search"
        data-testid="search-input"
        onChange={hook.onSearchInputChange}
        type="search"
        value={hook.searchInputValue}
      />
      <button data-testid="commit-now" onClick={hook.commitNow} type="button">
        Commit
      </button>
    </div>
  );
}

describe('useDebouncedSearchParam', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test('reads initial q from the URL for SSR-safe first paint', () => {
    const RoutesStub = createRoutesStub([
      { Component: SearchHarness, path: '/' },
    ]);

    const component = render(<RoutesStub initialEntries={['/?q=hello']} />);

    expect(component.getByTestId('committed-q')).toHaveTextContent('hello');
    expect(component.getByTestId('search-input')).toHaveValue('hello');
  });

  test('commits trimmed q after debounce when typing', async () => {
    const RoutesStub = createRoutesStub([
      { Component: SearchHarness, path: '/' },
    ]);

    const component = render(<RoutesStub initialEntries={['/']} />);

    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    await user.type(component.getByTestId('search-input'), 'abc');

    expect(component.getByTestId('committed-q')).toHaveTextContent('');

    // shouldAdvanceTime lets real elapsed time leak into the fake clock, so
    // leave slack on both sides of the 300ms window instead of an exact edge.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(150);
    });

    expect(component.getByTestId('committed-q')).toHaveTextContent('');

    await act(async () => {
      await vi.advanceTimersByTimeAsync(200);
    });

    expect(component.getByTestId('committed-q')).toHaveTextContent('abc');
  });

  test('commitNow writes immediately without waiting for debounce', async () => {
    const RoutesStub = createRoutesStub([
      { Component: SearchHarness, path: '/' },
    ]);

    const component = render(<RoutesStub initialEntries={['/']} />);

    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    await user.type(component.getByTestId('search-input'), 'fast');

    expect(component.getByTestId('committed-q')).toHaveTextContent('');

    await user.click(component.getByTestId('commit-now'));

    expect(component.getByTestId('committed-q')).toHaveTextContent('fast');
  });

  test('applies transformCommittedParams on commit', async () => {
    // eslint-disable-next-line react/no-multi-comp -- test-local harness component
    function HarnessWithTransform() {
      const [searchParams] = useSearchParams();
      const hook = useDebouncedSearchParam({
        transformCommittedParams: (next) => {
          next.set('page', '1');
          next.set('limit', '50');
        },
      });

      return (
        <div>
          <span data-testid="full-query">{searchParams.toString()}</span>
          <input
            aria-label="Search"
            data-testid="search-input"
            onChange={hook.onSearchInputChange}
            type="search"
            value={hook.searchInputValue}
          />
        </div>
      );
    }

    const RoutesStub = createRoutesStub([
      { Component: HarnessWithTransform, path: '/' },
    ]);

    const component = render(<RoutesStub initialEntries={['/']} />);

    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    await user.type(component.getByTestId('search-input'), 'x');

    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });

    const query = component.getByTestId('full-query').textContent ?? '';
    expect(query).toContain('q=x');
    expect(query).toContain('page=1');
    expect(query).toContain('limit=50');
  });
});
