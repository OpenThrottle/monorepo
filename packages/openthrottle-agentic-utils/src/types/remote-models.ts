/**
 * Public types for REMOTE model catalogs.
 *
 * A remote catalog is a hosted gateway that publishes the models it can route
 * to (today: OpenRouter's `GET /api/v1/models`). This is deliberately a
 * separate shape from local discovery's {@link ModelEndpoint}: that type is
 * defined by `host`/`port` because it describes a server found by scanning
 * `localhost`, which says nothing meaningful about a gateway reached over the
 * public internet. Widening `ModelProvider`/`ModelEndpoint` to cover both would
 * break the local scan's semantics, so remote providers get their own types.
 */

/**
 * Known remote catalog providers. An `as const` object rather than a TS enum,
 * per the repo's style rules.
 *
 * @public
 */
export const RemoteModelProviderId = {
  openrouter: `openrouter`,
} as const;

/**
 * A remote catalog provider id.
 *
 * @public
 */
export type RemoteModelProviderId =
  (typeof RemoteModelProviderId)[keyof typeof RemoteModelProviderId];

/**
 * One routable model published by a remote catalog.
 *
 * @public
 */
export interface RemoteModel {
  /** Maximum context window in tokens, as advertised by the provider. */
  readonly contextLength: number;
  /** Provider-scoped model slug, e.g. `anthropic/claude-sonnet-5`. */
  readonly id: string;
  /** Human-readable label, e.g. `Anthropic: Claude Sonnet 5`. */
  readonly name: string;
  /** The catalog this model was published by. */
  readonly provider: RemoteModelProviderId;
}

/**
 * The result of one remote catalog fetch.
 *
 * An empty `models` array is the documented degraded state — a non-2xx
 * response, a network failure, or a timeout all yield an empty catalog rather
 * than throwing, so an unreachable gateway can never break a page load.
 *
 * @public
 */
export interface RemoteModelCatalog {
  /** ISO-8601 timestamp; stamped by the caller, never by the pure core. */
  readonly fetchedAt: string;
  /** Models sorted by `id` and de-duplicated. */
  readonly models: readonly RemoteModel[];
  /** The catalog that was fetched. */
  readonly provider: RemoteModelProviderId;
}

/**
 * The subset of the `fetch` contract the remote catalog core depends on.
 * Injected by tests so no suite ever touches the network.
 *
 * @public
 */
export type RemoteFetchImpl = typeof fetch;

/**
 * Explicit options for a remote catalog fetch. No implicit env reads — the
 * caller resolves `baseUrl`/`apiKey` from configuration and passes them in.
 *
 * @public
 */
export interface FetchRemoteModelsOptions {
  /**
   * Bearer token for the gateway. Optional: OpenRouter serves its catalog
   * unauthenticated, so this is sent only when present.
   */
  readonly apiKey?: string;
  /** Gateway API root, e.g. `https://openrouter.ai/api/v1` (no trailing slash required). */
  readonly baseUrl: string;
  /** Injected `fetch`. Defaults to the global. */
  readonly fetchImpl?: RemoteFetchImpl;
  /**
   * ISO-8601 fetch timestamp. The caller stamps this (e.g. the cached Nest
   * wrapper); when omitted it defaults to the current time.
   */
  readonly fetchedAt?: string;
  /** Extra headers merged into the request, e.g. OpenRouter attribution headers. */
  readonly headers?: Readonly<Record<string, string>>;
  /** Request timeout in milliseconds. Default {@link DEFAULT_REMOTE_CATALOG_TIMEOUT_MS}. */
  readonly timeoutMs?: number;
}
