import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { useFileMentionProvider } from '../useFileMentionProvider';

const paths = ['src/App.tsx', 'src/app-shell.ts', 'lib/util.ts'];

const okResponse = (): Response =>
  new Response(
    JSON.stringify({ paths, query: '', repositoryId: 'r1', truncated: false }),
    {
      headers: { 'content-type': 'application/json' },
      status: 200,
    },
  );

describe('useFileMentionProvider', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn(async () => okResponse());
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test('returns undefined when no repository is selected', () => {
    const { result } = renderHook(() => useFileMentionProvider(undefined));
    expect(result.current).toBeUndefined();
  });

  test('fetches the listing once and fuzzy-filters client-side', async () => {
    const { result } = renderHook(() => useFileMentionProvider('r1'));
    const provider = result.current;
    expect(provider).toBeDefined();

    const all = await provider!.onQueryFiles('');
    expect(all).toEqual(paths);

    const filtered = await provider!.onQueryFiles('APP');
    expect(filtered).toEqual(['src/App.tsx', 'src/app-shell.ts']);

    // Cached: the second query does not hit the network again.
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith('/ide/files?repositoryId=r1');
  });

  test('de-duplicates concurrent first fetches for the same repository', async () => {
    const { result } = renderHook(() => useFileMentionProvider('r1'));
    const provider = result.current;

    await Promise.all([
      provider!.onQueryFiles('a'),
      provider!.onQueryFiles('b'),
    ]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  test('returns no matches when the listing request fails', async () => {
    fetchMock.mockResolvedValue(new Response('', { status: 500 }));
    const { result } = renderHook(() => useFileMentionProvider('r1'));

    await waitFor(async () => {
      expect(await result.current!.onQueryFiles('app')).toEqual([]);
    });
  });
});
