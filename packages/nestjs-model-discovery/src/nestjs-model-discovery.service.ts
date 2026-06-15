import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LoggerService } from '@openthrottle/nestjs-modules';
import type { DiscoveryResult } from '@openthrottle/openthrottle-agentic-utils';
import { discoverModels } from '@openthrottle/openthrottle-agentic-utils';

import type { ModelDiscoveryConfig } from './config/nestjs-model-discovery.config';
import {
  buildModelDiscoveryConfig,
  MODEL_DISCOVERY_CONFIG_NAMESPACE,
} from './config/nestjs-model-discovery.config';

/** Options for {@link NestjsModelDiscoveryService.discover}. */
export interface DiscoverOptions {
  /** Bypass the in-process cache and force a fresh scan. */
  readonly forceRefresh?: boolean;
}

interface CacheEntry {
  readonly expiresAt: number;
  readonly result: DiscoveryResult;
}

/**
 * Injectable, in-process-cached wrapper around the model-discovery core. A
 * local scan is sub-second, so freshness comes from a short TTL cache rather
 * than Redis/BullMQ. GraphQL-agnostic — the resolver lives in the server.
 */
@Injectable()
export class NestjsModelDiscoveryService {
  private cache: CacheEntry | null = null;

  constructor(
    private readonly configService: ConfigService,
    private readonly logger: LoggerService,
  ) {}

  /** Resolved config from the registered namespace, or an env-derived default. */
  private getConfig(): ModelDiscoveryConfig {
    return (
      this.configService.get<ModelDiscoveryConfig>(
        MODEL_DISCOVERY_CONFIG_NAMESPACE,
      ) ?? buildModelDiscoveryConfig(process.env)
    );
  }

  /**
   * Discover local OpenAI-compatible model servers. Returns the cached snapshot
   * when it is still within the TTL window; otherwise runs a fresh scan, stamps
   * `scannedAt`, and refreshes the cache.
   */
  async discover(options: DiscoverOptions = {}): Promise<DiscoveryResult> {
    const now = Date.now();
    if (
      !options.forceRefresh &&
      this.cache !== null &&
      now < this.cache.expiresAt
    ) {
      return this.cache.result;
    }

    const config = this.getConfig();
    const result = await discoverModels({
      fingerprintTimeoutMs: config.fingerprintTimeoutMs,
      hosts: config.hosts,
      maxConcurrency: config.maxConcurrency,
      ports: config.ports,
      probeTimeoutMs: config.probeTimeoutMs,
      scannedAt: new Date().toISOString(),
    });

    this.cache = { expiresAt: now + config.cacheTtlMs, result };
    this.logger.debug(
      `🔭 model-discovery: ${result.endpoints.length} endpoint(s) across ${result.scannedHosts.length} host(s)`,
    );
    return result;
  }

  /** Drop the cached snapshot so the next {@link discover} re-scans. */
  invalidate(): void {
    this.cache = null;
  }
}
