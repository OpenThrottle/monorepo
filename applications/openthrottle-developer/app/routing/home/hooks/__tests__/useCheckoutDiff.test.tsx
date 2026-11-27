import { act, render, waitFor } from '@testing-library/react';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';

import { CheckoutDiffFileStatus } from '~/__generated__/graphql';
import type { CheckoutDiffResourceData } from '~/routing/home/types';

import type {
  UseCheckoutDiffOptions,
  UseCheckoutDiffResult,
} from '../useCheckoutDiff';
import { useCheckoutDiff } from '../useCheckoutDiff';

interface Rendered {
  readonly requests: string[];
  readonly rerender: (options: UseCheckoutDiffOptions) => void;
  readonly value: { current: UseCheckoutDiffResult | null };
}

const diffFor = (checkoutId: string): CheckoutDiffResourceData => {
  return {
    checkoutId,
    diff: {
      additions: 2,
      available: true,
      baseRef: 'origin/main',
      deletions: 1,
      files: [
        {
          additions: 2,
          binary: false,
          deletions: 1,
          path: 'src/a.ts',
          previousPath: null,
          status: CheckoutDiffFileStatus.Modified,
        },
      ],
      filesTruncated: false,
      headBranch: 'feat/x',
      pullRequest: null,
      reason: null,
    },
    kind: 'diff',
  };
};

const fileFor = (
  checkoutId: string,
  path: string,
): CheckoutDiffResourceData => {
  return {
    checkoutId,
    file: {
      available: true,
      binary: false,
      patch: '@@ -1 +1 @@\n-a\n+b\n',
      path,
      reason: null,
      truncated: false,
    },
    kind: 'file',
    path,
  };
};

const renderHook = (initial: UseCheckoutDiffOptions): Rendered => {
  const requests: string[] = [];
  const value: { current: UseCheckoutDiffResult | null } = { current: null };
  const setOptionsRef: {
    current: (options: UseCheckoutDiffOptions) => void;
  } = { current: () => undefined };

  function Probe(): null {
    const [options, setOptions] = React.useState(initial);
    setOptionsRef.current = setOptions;
    value.current = useCheckoutDiff(options);

    return null;
  }

  const Stub = createRoutesStub([
    { Component: Probe, path: '/' },
    {
      loader: ({ request }) => {
        const url = new URL(request.url);
        requests.push(url.search);
        const checkoutId = url.searchParams.get('checkoutId') ?? '';
        const path = url.searchParams.get('path');

        return path === null ? diffFor(checkoutId) : fileFor(checkoutId, path);
      },
      path: '/resources/checkout-diff',
    },
  ]);
  render(<Stub initialEntries={['/']} />);

  return {
    requests,
    rerender: (options) => {
      act(() => {
        setOptionsRef.current(options);
      });
    },
    value,
  };
};

const ENABLED: UseCheckoutDiffOptions = {
  checkoutId: 'c-1',
  isEnabled: true,
  isStreaming: false,
};

describe('useCheckoutDiff', () => {
  describe('when disabled or without a checkout', () => {
    test('fetches nothing', async () => {
      const { requests, value } = renderHook({
        ...ENABLED,
        isEnabled: false,
      });

      await act(async () => {
        await Promise.resolve();
      });

      expect(requests).toEqual([]);
      expect(value.current?.diff).toBeUndefined();
    });

    test('has no diff and is not loading without a checkout id', () => {
      const { value } = renderHook({ ...ENABLED, checkoutId: undefined });

      expect(value.current).toMatchObject({
        diff: undefined,
        isLoading: false,
      });
    });
  });

  describe('when enabled', () => {
    test('loads the diff for the checkout', async () => {
      const { requests, value } = renderHook(ENABLED);

      await waitFor(() => {
        expect(value.current?.diff).toMatchObject({
          available: true,
          files: [{ status: 'modified' }],
        });
      });

      expect(requests[0]).toBe('?checkoutId=c-1');
    });

    test('loads the patch lazily when a file is selected', async () => {
      const { requests, value } = renderHook(ENABLED);

      await waitFor(() => {
        expect(value.current?.diff).toBeDefined();
      });
      expect(requests).toHaveLength(1);

      act(() => {
        value.current?.onSelectFile('src/a.ts');
      });

      await waitFor(() => {
        expect(value.current?.selectedPatch).toContain('+b');
      });

      expect(requests).toContain('?checkoutId=c-1&path=src%2Fa.ts');
      expect(value.current?.selectedFile).toBe('src/a.ts');
    });

    test('closing the file clears the selection', async () => {
      const { value } = renderHook(ENABLED);

      await waitFor(() => {
        expect(value.current?.diff).toBeDefined();
      });

      act(() => {
        value.current?.onSelectFile('src/a.ts');
      });
      act(() => {
        value.current?.onCloseFile();
      });

      expect(value.current?.selectedFile).toBeUndefined();
      expect(value.current?.selectedPatch).toBeUndefined();
    });

    test('refresh fetches the diff again', async () => {
      const { requests, value } = renderHook(ENABLED);

      await waitFor(() => {
        expect(value.current?.diff).toBeDefined();
      });

      act(() => {
        value.current?.onRefresh();
      });

      await waitFor(() => {
        expect(requests).toHaveLength(2);
      });
    });

    test('refetches when a turn finishes streaming', async () => {
      const { rerender, requests, value } = renderHook({
        ...ENABLED,
        isStreaming: true,
      });

      await waitFor(() => {
        expect(value.current?.diff).toBeDefined();
      });
      expect(requests).toHaveLength(1);

      rerender({ ...ENABLED, isStreaming: false });

      await waitFor(() => {
        expect(requests).toHaveLength(2);
      });
    });

    test('changing checkout clears the selection', async () => {
      const { rerender, value } = renderHook(ENABLED);

      await waitFor(() => {
        expect(value.current?.diff).toBeDefined();
      });
      act(() => {
        value.current?.onSelectFile('src/a.ts');
      });
      rerender({ ...ENABLED, checkoutId: 'c-2' });

      await waitFor(() => {
        expect(value.current?.selectedFile).toBeUndefined();
      });
    });
  });
});
