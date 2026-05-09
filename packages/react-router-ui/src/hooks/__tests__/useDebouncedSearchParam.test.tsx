import * as React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRoutesStub, useSearchParams } from 'react-router';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import {
  useDebouncedSearchParam,
  type UseDebouncedSearchParamOptions,
} from '../useDebouncedSearchParam';

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
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test('reads initial q from the URL for SSR-safe first paint', () => {
    const RoutesStub = createRoutesStub([
      { Component: SearchHarness, path: '/' },
    ]);

    render(<RoutesStub initialEntries={['/?q=hello']} />);

    expect(screen.getByTestId('committed-q')).toHaveTextContent('hello');
    expect(screen.getByTestId('search-input')).toHaveValue('hello');
  });

  test('commits trimmed q after debounce when typing', async () => {
    const user = userEvent.setup({
      advanceTimers: vi.advanceTimersByTime,
    });
    const RoutesStub = createRoutesStub([
      { Component: SearchHarness, path: '/' },
    ]);

    render(<RoutesStub initialEntries={['/']} />);

    await user.type(screen.getByTestId('search-input'), 'abc');

    expect(screen.getByTestId('committed-q')).toHaveTextContent('');

    await vi.advanceTimersByTimeAsync(299);

    expect(screen.getByTestId('committed-q')).toHaveTextContent('');

    await vi.advanceTimersByTimeAsync(1);

    expect(screen.getByTestId('committed-q')).toHaveTextContent('abc');
  });

  test('commitNow writes immediately without waiting for debounce', async () => {
    const user = userEvent.setup({
      advanceTimers: vi.advanceTimersByTime,
    });
    const RoutesStub = createRoutesStub([
      { Component: SearchHarness, path: '/' },
    ]);

    render(<RoutesStub initialEntries={['/']} />);

    await user.type(screen.getByTestId('search-input'), 'fast');

    expect(screen.getByTestId('committed-q')).toHaveTextContent('');

    await user.click(screen.getByTestId('commit-now'));

    expect(screen.getByTestId('committed-q')).toHaveTextContent('fast');
  });

  test('applies transformCommittedParams on commit', async () => {
    const user = userEvent.setup({
      advanceTimers: vi.advanceTimersByTime,
    });

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

    render(<RoutesStub initialEntries={['/']} />);

    await user.type(screen.getByTestId('search-input'), 'x');
    await vi.advanceTimersByTimeAsync(300);

    const query = screen.getByTestId('full-query').textContent ?? '';
    expect(query).toContain('q=x');
    expect(query).toContain('page=1');
    expect(query).toContain('limit=50');
  });
});
