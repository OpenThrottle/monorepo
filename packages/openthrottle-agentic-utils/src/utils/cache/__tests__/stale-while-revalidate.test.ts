import { describe, expect, it, vi } from 'vitest';

import { StaleWhileRevalidateCache } from '../stale-while-revalidate.ts';

/** Flush pending microtasks so a background refresh's stamping runs. */
async function flush(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

const TTLS = { hardTtlMs: 600, softTtlMs: 60 } as const;

/** Build a cache with a controllable clock and a call-counting loader. */
function build(values: string[] = ['v0', 'v1', 'v2']) {
  let clock = 1_000;
  const cache = new StaleWhileRevalidateCache<string>(() => clock);
  const load = vi.fn(() => Promise.resolve(values[load.mock.calls.length - 1]));
  return {
    advance: (ms: number): void => {
      clock += ms;
    },
    cache,
    load,
  };
}

describe('StaleWhileRevalidateCache', () => {
  it('blocks and loads on the very first call', async () => {
    const { cache, load } = build();
    const result = await cache.get(load, TTLS);
    expect(result).toBe('v0');
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('serves the fresh snapshot within the soft TTL without reloading', async () => {
    const { advance, cache, load } = build();
    await cache.get(load, TTLS);
    advance(59);
    const second = await cache.get(load, TTLS);
    expect(second).toBe('v0');
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('returns the STALE snapshot synchronously and schedules exactly one background refresh past the soft TTL', async () => {
    const { advance, cache, load } = build();
    await cache.get(load, TTLS);

    // Cross the soft TTL but stay within the hard TTL.
    advance(100);
    const stale = await cache.get(load, TTLS);
    expect(stale).toBe('v0'); // last-good value, served immediately
    expect(load).toHaveBeenCalledTimes(2); // background refresh kicked off

    await flush();
    // The background refresh has settled; the next read is the fresh value.
    const fresh = await cache.get(load, TTLS);
    expect(fresh).toBe('v1');
    expect(load).toHaveBeenCalledTimes(2); // no extra scan for the fresh read
  });

  it('coalesces concurrent stale reads into a single background refresh', async () => {
    const { advance, cache, load } = build();
    await cache.get(load, TTLS);
    advance(100);

    const [a, b, c] = await Promise.all([
      cache.get(load, TTLS),
      cache.get(load, TTLS),
      cache.get(load, TTLS),
    ]);
    expect([a, b, c]).toEqual(['v0', 'v0', 'v0']);
    expect(load).toHaveBeenCalledTimes(2); // one initial + one shared refresh
  });

  it('blocks on a fresh scan once past the hard TTL', async () => {
    const { advance, cache, load } = build();
    await cache.get(load, TTLS);
    advance(700); // past hardTtlMs (600)
    const result = await cache.get(load, TTLS);
    expect(result).toBe('v1'); // freshly loaded, not the stale v0
    expect(load).toHaveBeenCalledTimes(2);
  });

  it('keeps the last-good snapshot when a background refresh fails', async () => {
    let clock = 1_000;
    const cache = new StaleWhileRevalidateCache<string>(() => clock);
    const load = vi
      .fn<() => Promise<string>>()
      .mockResolvedValueOnce('v0')
      .mockRejectedValueOnce(new Error('scan failed'))
      .mockResolvedValueOnce('v2');

    expect(await cache.get(load, TTLS)).toBe('v0');
    clock += 100;
    // Background refresh rejects — the stale value is still served, no throw.
    expect(await cache.get(load, TTLS)).toBe('v0');
    await flush();
    // Snapshot survived the failed refresh; a later read retries and succeeds.
    clock += 1; // still stale, triggers another refresh
    expect(await cache.get(load, TTLS)).toBe('v0');
    await flush();
    expect(await cache.get(load, TTLS)).toBe('v2');
  });

  it('bypasses the snapshot and blocks when forceRefresh is set', async () => {
    const { cache, load } = build();
    await cache.get(load, TTLS);
    const forced = await cache.get(load, TTLS, true);
    expect(forced).toBe('v1');
    expect(load).toHaveBeenCalledTimes(2);
  });

  it('re-scans on the next call after invalidate()', async () => {
    const { cache, load } = build();
    await cache.get(load, TTLS);
    cache.invalidate();
    const result = await cache.get(load, TTLS);
    expect(result).toBe('v1');
    expect(load).toHaveBeenCalledTimes(2);
  });

  it('coalesces concurrent first-ever callers into one scan', async () => {
    const { cache, load } = build();
    const [a, b] = await Promise.all([
      cache.get(load, TTLS),
      cache.get(load, TTLS),
    ]);
    expect(a).toBe('v0');
    expect(b).toBe('v0');
    expect(load).toHaveBeenCalledTimes(1);
  });
});
