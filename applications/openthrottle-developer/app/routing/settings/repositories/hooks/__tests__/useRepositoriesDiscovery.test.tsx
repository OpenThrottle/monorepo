import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, test } from 'vitest';

import { mockDiscoveredWorktrees } from '~/routing/settings/repositories/testing/mock-repositories';
import type { RepositoriesDiscovery } from '~/routing/settings/repositories/types';

import { useRepositoriesDiscovery } from '../useRepositoriesDiscovery';

const scan = (scannedAt: string): RepositoriesDiscovery => {
  return {
    discoveredFolders: [],
    discoveredWorktrees: mockDiscoveredWorktrees({ scannedAt }),
  };
};

/** A promise the test settles by hand, so ordering is explicit rather than raced. */
const deferred = (): {
  readonly promise: Promise<RepositoriesDiscovery>;
  readonly reject: (error: Error) => void;
  readonly resolve: (value: RepositoriesDiscovery) => void;
} => {
  let resolve: (value: RepositoriesDiscovery) => void = () => {
    return undefined;
  };
  let reject: (error: Error) => void = () => {
    return undefined;
  };
  const promise = new Promise<RepositoriesDiscovery>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, reject, resolve };
};

describe('useRepositoriesDiscovery', () => {
  test('is pending until the first scan resolves, then resolved', async () => {
    const first = deferred();
    const { result } = renderHook(() =>
      useRepositoriesDiscovery({ promise: first.promise }),
    );

    expect(result.current.status).toBe('pending');

    first.resolve(scan('t1'));

    await waitFor(() => {
      expect(result.current).toEqual({ status: 'resolved', value: scan('t1') });
    });
  });

  test('reports a first-load failure', async () => {
    // Created once: a promise built inside the render callback would be a new one every render.
    const failed = deferred();
    const { result } = renderHook(() =>
      useRepositoriesDiscovery({ promise: failed.promise }),
    );

    failed.reject(new Error('git exploded'));

    await waitFor(() => {
      expect(result.current.status).toBe('rejected');
    });
  });

  describe('on a revalidation', () => {
    test('keeps the previous scan on screen until the new one lands', async () => {
      const second = deferred();
      const { rerender, result } = renderHook(
        (props: { readonly promise: Promise<RepositoriesDiscovery> }) =>
          useRepositoriesDiscovery(props),
        { initialProps: { promise: Promise.resolve(scan('t1')) } },
      );
      await waitFor(() => {
        expect(result.current.status).toBe('resolved');
      });

      rerender({ promise: second.promise });

      expect(result.current).toEqual({ status: 'resolved', value: scan('t1') });

      second.resolve(scan('t2'));

      await waitFor(() => {
        expect(result.current).toEqual({
          status: 'resolved',
          value: scan('t2'),
        });
      });
    });

    test('keeps the previous scan when the new one fails', async () => {
      const second = deferred();
      const { rerender, result } = renderHook(
        (props: { readonly promise: Promise<RepositoriesDiscovery> }) =>
          useRepositoriesDiscovery(props),
        { initialProps: { promise: Promise.resolve(scan('t1')) } },
      );
      await waitFor(() => {
        expect(result.current.status).toBe('resolved');
      });

      rerender({ promise: second.promise });
      second.reject(new Error('git exploded'));
      await second.promise.catch(() => undefined);

      expect(result.current).toEqual({ status: 'resolved', value: scan('t1') });
    });

    test('never lets a superseded scan overwrite a newer one', async () => {
      const stale = deferred();
      const fresh = deferred();
      const { rerender, result } = renderHook(
        (props: { readonly promise: Promise<RepositoriesDiscovery> }) =>
          useRepositoriesDiscovery(props),
        { initialProps: { promise: stale.promise } },
      );

      rerender({ promise: fresh.promise });
      fresh.resolve(scan('fresh'));
      await waitFor(() => {
        expect(result.current.status).toBe('resolved');
      });
      stale.resolve(scan('stale'));
      await stale.promise;

      expect(result.current).toEqual({
        status: 'resolved',
        value: scan('fresh'),
      });
    });
  });
});
