/**
 * Framework-agnostic stale-while-revalidate (SWR) cache for a single value.
 *
 * Discovery scans (agent CLIs, local models) are expensive on a cold cache
 * (child-process spawns / dozens of HTTP probes) but their result changes
 * rarely. SWR lets repeat loads never pay that cold cost: once a snapshot
 * exists it is returned immediately, and once it crosses the *soft* TTL a single
 * coalesced refresh runs in the background while callers keep getting the
 * last-good value. Only two calls ever block on a scan: the very first (no
 * snapshot at all), and any call made after the snapshot crosses the *hard* TTL
 * (so an idle process doesn't serve arbitrarily stale data forever).
 *
 * Concurrency: at most one scan (blocking or background) is ever in flight;
 * concurrent callers share it. A failed background refresh is swallowed — the
 * last-good snapshot survives and the next call retries — so a transient scan
 * failure never poisons the cache.
 */

/** Per-call freshness bounds for {@link StaleWhileRevalidateCache.get}. */
export interface SwrTtls {
  /**
   * Hard TTL in ms. Past this the snapshot is too stale to serve and the next
   * call blocks on a fresh scan. Clamped up to `softTtlMs` when smaller.
   */
  readonly hardTtlMs: number;
  /**
   * Soft TTL in ms. Within this window the snapshot is fresh and served with no
   * refresh. Past it (but within the hard TTL) the snapshot is served stale
   * while a background refresh runs. `0` means "always stale" — every call
   * triggers a refresh (blocking when combined with `hardTtlMs: 0`).
   */
  readonly softTtlMs: number;
}

interface CacheEntry<T> {
  readonly hardExpiresAt: number;
  readonly result: T;
  readonly softExpiresAt: number;
}

/**
 * A single-slot stale-while-revalidate cache. Construct one per cached value and
 * call {@link get} with a loader that performs the (expensive) scan.
 *
 * @public
 */
export class StaleWhileRevalidateCache<T> {
  private entry: CacheEntry<T> | null = null;
  private inFlight: Promise<T> | null = null;

  /**
   * Clock seam so tests can drive expiry deterministically. Defaults to a
   * wrapper that calls `Date.now()` fresh on each read (rather than capturing the
   * `Date.now` reference) so fake timers installed after construction still take
   * effect.
   */
  constructor(private readonly now: () => number = () => Date.now()) {}

  /**
   * Fetch through the cache. Returns the fresh snapshot within the soft TTL; the
   * stale snapshot (plus a background refresh) between soft and hard TTL; and a
   * blocking fresh scan when there is no snapshot or it is past the hard TTL.
   *
   * @param load - Performs one scan. Invoked at most once per refresh; callers
   *   that arrive during an in-flight scan share its promise.
   * @param ttls - Freshness bounds for this call (read fresh each call so
   *   config changes take effect without reconstructing the cache).
   * @param forceRefresh - Bypass the snapshot and block on a fresh scan.
   */
  async get(
    load: () => Promise<T>,
    ttls: SwrTtls,
    forceRefresh = false,
  ): Promise<T> {
    const now = this.now();

    if (!forceRefresh && this.entry !== null) {
      if (now < this.entry.softExpiresAt) {
        return this.entry.result;
      }

      if (now < this.entry.hardExpiresAt) {
        // Stale but usable: serve it now, refresh out of band (coalesced).
        this.refreshInBackground(load, ttls);
        return this.entry.result;
      }
      // Past the hard TTL — fall through to a blocking refresh.
    }

    // Blocking path (first-ever call, past hard TTL, or forceRefresh). Coalesce
    // with any scan already running unless this is a forced refresh.
    if (!forceRefresh && this.inFlight !== null) {
      return this.inFlight;
    }

    return this.runScan(load, ttls);
  }

  /** Drop the snapshot so the next {@link get} blocks on a fresh scan. */
  invalidate(): void {
    this.entry = null;
  }

  /** Kick a single background refresh; no-op when a scan is already in flight. */
  private refreshInBackground(load: () => Promise<T>, ttls: SwrTtls): void {
    if (this.inFlight !== null) {
      return;
    }

    // Swallow failures so the last-good snapshot survives a transient scan error
    // (the next call retries); clear inFlight once settled.
    const scan = this.startScan(load, ttls);
    scan
      .catch(() => undefined)
      .finally(() => {
        if (this.inFlight === scan) {
          this.inFlight = null;
        }
      });
  }

  /** Run a blocking scan, sharing failures with awaiting callers. */
  private async runScan(load: () => Promise<T>, ttls: SwrTtls): Promise<T> {
    const scan = this.startScan(load, ttls);

    try {
      return await scan;
    } finally {
      if (this.inFlight === scan) {
        this.inFlight = null;
      }
    }
  }

  /** Start a scan, register it as in-flight, and stamp the entry on success. */
  private startScan(load: () => Promise<T>, ttls: SwrTtls): Promise<T> {
    const hardTtlMs = Math.max(ttls.hardTtlMs, ttls.softTtlMs);
    const scan = load().then((result) => {
      const stampedAt = this.now();
      this.entry = {
        hardExpiresAt: stampedAt + hardTtlMs,
        result,
        softExpiresAt: stampedAt + ttls.softTtlMs,
      };
      return result;
    });

    this.inFlight = scan;
    return scan;
  }
}
