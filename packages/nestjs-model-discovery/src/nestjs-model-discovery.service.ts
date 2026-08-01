import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LoggerService } from '@openthrottle/nestjs-modules';
import type { DiscoveryResult } from '@openthrottle/openthrottle-agentic-utils';
import {
  discoverModels,
  StaleWhileRevalidateCache,
} from '@openthrottle/openthrottle-agentic-utils';

import type { ModelDiscoveryConfig } from './config/nestjs-model-discovery.config';
import { MODEL_DISCOVERY_CONFIG_NAMESPACE } from './config/nestjs-model-discovery.config';

/** Options for {@link NestjsModelDiscoveryService.discover}. */
export interface DiscoverOptions {
  /** Bypass the in-process cache and force a fresh scan. */
  readonly forceRefresh?: boolean;
}

/**
 * Injectable, stale-while-revalidate-cached wrapper around the model-discovery
 * core. A local scan is sub-second but the result changes rarely, so repeat
 * loads serve the last-good snapshot (refreshing out of band once past the soft
 * TTL) rather than paying the cold ~48-probe cost. GraphQL-agnostic — the
 * resolver lives in the server.
 */
@Injectable()
export class NestjsModelDiscoveryService {
  private readonly cache = new StaleWhileRevalidateCache<DiscoveryResult>();

  constructor(
    private readonly configService: ConfigService,
    private readonly logger: LoggerService,
  ) {}

  /**
   * Resolved config from the registered namespace. The module always registers
   * the `modelDiscovery` namespace, which is the single boundary where
   * `process.env` is read; if it is missing the wiring is broken, so we fail
   * loud rather than silently re-reading `process.env` here.
   */
  private getConfig(): ModelDiscoveryConfig {
    const config = this.configService.get<ModelDiscoveryConfig>(
      MODEL_DISCOVERY_CONFIG_NAMESPACE,
    );

    if (config === undefined) {
      throw new Error(
        `Missing '${MODEL_DISCOVERY_CONFIG_NAMESPACE}' config namespace — register NestjsModelDiscoveryModule (or its ConfigModule.forFeature) before resolving NestjsModelDiscoveryService.`,
      );
    }

    return config;
  }

  /**
   * Discover local OpenAI-compatible model servers with stale-while-revalidate
   * caching. Within the soft TTL the snapshot is served fresh; past it (but
   * within the hard TTL) the last-good snapshot is served immediately while a
   * single coalesced background refresh runs; only the first-ever call and calls
   * past the hard TTL block on a scan. `forceRefresh` bypasses the snapshot.
   */
  async discover(options: DiscoverOptions = {}): Promise<DiscoveryResult> {
    const config = this.getConfig();

    return this.cache.get(
      () => this.scan(config),
      { hardTtlMs: config.hardTtlMs, softTtlMs: config.cacheTtlMs },
      options.forceRefresh ?? false,
    );
  }

  /** Drop the cached snapshot so the next {@link discover} re-scans. */
  invalidate(): void {
    this.cache.invalidate();
  }

  /** Run a fresh scan and stamp `scannedAt`. */
  private async scan(config: ModelDiscoveryConfig): Promise<DiscoveryResult> {
    const result = await discoverModels({
      fingerprintTimeoutMs: config.fingerprintTimeoutMs,
      hosts: config.hosts,
      maxConcurrency: config.maxConcurrency,
      ports: config.ports,
      probeTimeoutMs: config.probeTimeoutMs,
      scannedAt: new Date().toISOString(),
    });

    this.logger.debug(
      `🔭 model-discovery: ${result.endpoints.length} endpoint(s) across ${result.scannedHosts.length} host(s)`,
    );

    return result;
  }
}
