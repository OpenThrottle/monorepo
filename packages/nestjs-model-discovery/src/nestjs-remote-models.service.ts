import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LoggerService } from '@openthrottle/nestjs-modules';
import type { RemoteModelCatalog } from '@openthrottle/openthrottle-agentic-utils';
import {
  fetchOpenRouterModels,
  RemoteModelProviderId,
  StaleWhileRevalidateCache,
} from '@openthrottle/openthrottle-agentic-utils';

import type { RemoteModelsConfig } from './config/nestjs-remote-models.config';
import { REMOTE_MODELS_CONFIG_NAMESPACE } from './config/nestjs-remote-models.config';

/** Options for {@link NestjsRemoteModelsService.catalog}. */
export interface RemoteCatalogOptions {
  /** Bypass the in-process cache and force a fresh fetch. */
  readonly forceRefresh?: boolean;
}

/**
 * A remote catalog plus whether the provider is actually usable for chat.
 *
 * `configured` is derived from the presence of an API key and is the ONLY thing
 * a client ever learns about that key — the key itself never leaves this
 * package's config namespace.
 */
export interface RemoteModelsResult {
  /** The fetched catalog; `models` is empty when the fetch degraded. */
  readonly catalog: RemoteModelCatalog;
  /** `true` when an operator key is set, so the provider can serve chat turns. */
  readonly configured: boolean;
}

/**
 * Injectable, stale-while-revalidate-cached wrapper around the remote
 * model-catalog core, the remote sibling of {@link NestjsModelDiscoveryService}.
 *
 * The TTLs are deliberately far longer than local discovery's: this is one
 * internet round trip for a few-hundred-entry published catalog that changes on
 * the order of days, so a page load must never pay for it. GraphQL-agnostic —
 * the resolver lives in the server.
 */
@Injectable()
export class NestjsRemoteModelsService {
  private readonly cache = new StaleWhileRevalidateCache<RemoteModelCatalog>();

  constructor(
    private readonly configService: ConfigService,
    private readonly logger: LoggerService,
  ) {}

  /**
   * Fetch the remote catalog with stale-while-revalidate caching. Within the
   * soft TTL the snapshot is served fresh; past it (but within the hard TTL) the
   * last-good snapshot is served immediately while a single coalesced background
   * refresh runs; only the first-ever call and calls past the hard TTL block.
   *
   * Never throws: the underlying fetcher degrades every failure mode to an empty
   * catalog, so an unreachable gateway can never break a page load.
   */
  async catalog(
    options: RemoteCatalogOptions = {},
  ): Promise<RemoteModelsResult> {
    const config = this.getConfig();

    const catalog = await this.cache.get(
      () => this.fetchCatalog(config),
      { hardTtlMs: config.hardTtlMs, softTtlMs: config.cacheTtlMs },
      options.forceRefresh ?? false,
    );

    return { catalog, configured: config.configured };
  }

  /**
   * The resolved gateway request parameters for a chat turn: base URL, key and
   * attribution headers. `null` when no key is configured, so a caller cannot
   * accidentally start an unauthenticated turn.
   *
   * The returned key is for immediate use on an outbound request only — it must
   * never be persisted, returned over GraphQL, or logged.
   */
  chatCredentials(): {
    apiKey: string;
    baseUrl: string;
    headers: Readonly<Record<string, string>>;
  } | null {
    const config = this.getConfig();

    if (!config.configured) {
      return null;
    }

    return {
      apiKey: config.apiKey,
      baseUrl: config.baseUrl,
      headers: config.headers,
    };
  }

  /** Drop the cached catalog so the next {@link catalog} re-fetches. */
  invalidate(): void {
    this.cache.invalidate();
  }

  /** Fetch a fresh catalog and stamp `fetchedAt`. */
  private async fetchCatalog(
    config: RemoteModelsConfig,
  ): Promise<RemoteModelCatalog> {
    const catalog = await fetchOpenRouterModels({
      apiKey: config.apiKey === '' ? undefined : config.apiKey,
      baseUrl: config.baseUrl,
      fetchedAt: new Date().toISOString(),
      headers: config.headers,
      timeoutMs: config.timeoutMs,
    });

    // Counts and the provider id only — never the key, and never the base URL
    // (which an operator could have embedded credentials in).
    this.logger.debug(
      `🛰️ remote-models: ${catalog.models.length} ${RemoteModelProviderId.openrouter} model(s)`,
    );

    return catalog;
  }

  /**
   * Resolved config from the registered namespace. The module always registers
   * the `remoteModels` namespace, which is the single boundary where the
   * `OPENROUTER_*` env vars are read; if it is missing the wiring is broken, so
   * we fail loud rather than silently re-reading `process.env` here.
   */
  private getConfig(): RemoteModelsConfig {
    const config = this.configService.get<RemoteModelsConfig>(
      REMOTE_MODELS_CONFIG_NAMESPACE,
    );

    if (config === undefined) {
      throw new Error(
        `Missing '${REMOTE_MODELS_CONFIG_NAMESPACE}' config namespace — register NestjsModelDiscoveryModule (or its ConfigModule.forFeature) before resolving NestjsRemoteModelsService.`,
      );
    }

    return config;
  }
}
