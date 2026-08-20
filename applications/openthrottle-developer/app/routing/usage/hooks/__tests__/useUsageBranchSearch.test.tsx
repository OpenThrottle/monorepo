import { act, render, waitFor } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { useUsageBranchSearch } from '../useUsageBranchSearch';
import type {
  UsageBranchOption,
  UsageBranchSearchData,
  UseUsageBranchSearchResult,
} from '../useUsageBranchSearch';

const INITIAL_OPTIONS: readonly UsageBranchOption[] = [
  { branch: 'main', count: 12 },
  { branch: 'alpha', count: 3 },
];

interface RenderedSearch {
  readonly loaderCalls: string[];
  readonly value: { current: UseUsageBranchSearchResult | null };
}

/**
 * Render the hook behind a routes stub whose `/resources/usage-branches`
 * loader is driven by `respond`, recording each requested URL.
 */
const renderSearch = (
  respond: (query: string) => UsageBranchSearchData,
): RenderedSearch => {
  const loaderCalls: string[] = [];
  const value: { current: UseUsageBranchSearchResult | null } = {
    current: null,
  };

  function Probe(): null {
    value.current = useUsageBranchSearch({
      debounceMs: 20,
      end: '2026-07-31',
      initialHasMore: false,
      initialOptions: INITIAL_OPTIONS,
      start: '2026-07-01',
    });

    return null;
  }

  const Stub = createRoutesStub([
    { Component: Probe, path: '/' },
    {
      loader: ({ request }) => {
        const url = new URL(request.url);
        loaderCalls.push(url.search);

        return respond(url.searchParams.get('query') ?? '');
      },
      path: '/resources/usage-branches',
    },
  ]);

  render(<Stub initialEntries={['/']} />);

  return { loaderCalls, value };
};

const emptyPage = (query: string): UsageBranchSearchData => ({
  hasMore: false,
  items: [],
  query,
});

describe('useUsageBranchSearch', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test('seeds from the SSR options so an opened dropdown is never empty', () => {
    const { loaderCalls, value } = renderSearch(emptyPage);

    expect(value.current?.options).toEqual(INITIAL_OPTIONS);
    expect(value.current?.search).toBe('');
    expect(loaderCalls).toEqual([]);
  });

  describe('when the user types', () => {
    test('debounces into a single request carrying the range', async () => {
      const { loaderCalls, value } = renderSearch((query) => ({
        hasMore: true,
        items: [{ branch: 'feat/usage', count: 4 }],
        query,
      }));

      act(() => {
        value.current?.onSearchChange('f');
      });
      act(() => {
        value.current?.onSearchChange('fe');
      });
      act(() => {
        value.current?.onSearchChange('feat');
      });

      expect(loaderCalls).toEqual([]);

      await act(async () => {
        await vi.advanceTimersByTimeAsync(30);
      });

      await waitFor(() => {
        expect(value.current?.options).toEqual([
          { branch: 'feat/usage', count: 4 },
        ]);
      });
      expect(loaderCalls).toHaveLength(1);
      expect(loaderCalls[0]).toContain('query=feat');
      expect(loaderCalls[0]).toContain('start=2026-07-01');
      expect(loaderCalls[0]).toContain('end=2026-07-31');
      expect(value.current?.hasMore).toBe(true);
      expect(value.current?.loading).toBe(false);
    });

    test('reports loading while the debounce and request are outstanding', async () => {
      const { value } = renderSearch(emptyPage);

      act(() => {
        value.current?.onSearchChange('feat');
      });

      expect(value.current?.loading).toBe(true);

      await act(async () => {
        await vi.advanceTimersByTimeAsync(30);
      });

      await waitFor(() => {
        expect(value.current?.loading).toBe(false);
      });
    });
  });

  describe('when a response echoes a stale query', () => {
    test('discards it rather than showing it for the current input', async () => {
      const { value } = renderSearch(() => ({
        hasMore: false,
        items: [{ branch: 'stale-branch', count: 1 }],
        // Echo a query the input never holds — a late keystroke's response.
        query: 'stale',
      }));

      act(() => {
        value.current?.onSearchChange('feat');
      });

      await act(async () => {
        await vi.advanceTimersByTimeAsync(30);
      });

      expect(value.current?.options).toEqual(INITIAL_OPTIONS);
      expect(
        value.current?.options.some((opt) => opt.branch === 'stale-branch'),
      ).toBe(false);
    });
  });

  describe('when the search is cleared', () => {
    test('falls back to the SSR page without issuing a request', async () => {
      const { loaderCalls, value } = renderSearch((query) => ({
        hasMore: false,
        items: [{ branch: 'feat/usage', count: 4 }],
        query,
      }));

      act(() => {
        value.current?.onSearchChange('feat');
      });
      await act(async () => {
        await vi.advanceTimersByTimeAsync(30);
      });
      await waitFor(() => {
        expect(value.current?.options).toHaveLength(1);
      });

      act(() => {
        value.current?.onSearchChange('   ');
      });

      expect(value.current?.options).toEqual(INITIAL_OPTIONS);
      expect(loaderCalls).toHaveLength(1);
    });
  });
});
