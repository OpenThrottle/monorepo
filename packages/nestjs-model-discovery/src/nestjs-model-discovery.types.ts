/** Options for {@link NestjsModelDiscoveryService.discover}. */
export interface DiscoverOptions {
  /** Bypass the in-process cache and force a fresh scan. */
  readonly forceRefresh?: boolean;
}
