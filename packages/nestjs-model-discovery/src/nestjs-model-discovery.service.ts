import type { OnApplicationBootstrap } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LoggerService } from '@openthrottle/nestjs-modules';
import type { DiscoveryResult } from '@openthrottle/openthrottle-agentic-utils';
import {
  discoverModels,
  StaleWhileRevalidateCache,
} from '@openthrottle/openthrottle-agentic-utils';

import { MODEL_DISCOVERY_CONFIG_NAMESPACE } from './config/config.constants.ts';
import type { ModelDiscoveryConfig } from './config/config.types.ts';
import type { DiscoverOptions } from './nestjs-model-discovery.types.ts';

/**
 * Injectable, stale-while-revalidate-cached wrapper around the model-discovery
 * core. A local scan is sub-second but the result changes rarely, so repeat
 * loads serve the last-good snapshot (refreshing out of band once past the soft
 * TTL) rather than paying the cold ~48-probe cost. GraphQL-agnostic — the
 * resolver lives in the server. Warms itself once after boot (see
 * {@link onApplicationBootstrap}) so the first chat load is not the cold scan.
 */
@Injectable()
export class NestjsModelDiscoveryService implements OnApplicationBootstrap {
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
   * Fire the boot warm-up without awaiting it, so bootstrap (and the HTTP
   * listener) never waits on probes. Gated by `LLM_DISCOVERY_WARM_ON_BOOT`.
   */
  onApplicationBootstrap(): void {
    void this.warm();
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

  /**
   * Scan once so the cache is warm before the first request; a request that
   * arrives mid-scan shares it rather than starting its own. Never throws: a
   * failed warm-up only means the first request pays the cold scan.
   */
  private async warm(): Promise<void> {
    try {
      if (!this.getConfig().warmOnBoot) {
        return;
      }

      await this.discover();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      this.logger.warn(`🔭 model-discovery: boot warm-up failed: ${message}`);
    }
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
