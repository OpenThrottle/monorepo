/**
 * @description In-process-cached wrapper over the agent-CLI discovery core
 * (openthrottle-agentic-utils). A `--version` probe is sub-second, so freshness
 * comes from a short TTL cache (60s, matching model-discovery) rather than
 * Redis/BullMQ. GraphQL-agnostic — the resolver lives alongside.
 */

import { Injectable } from '@nestjs/common';
import { LoggerService } from '@openthrottle/nestjs-modules';
import { discoverAgentClis } from '@openthrottle/openthrottle-agentic-utils';
import type { AgentCliDiscoveryResult } from '@openthrottle/openthrottle-agentic-utils';

const CACHE_TTL_MS = 60_000;

interface CacheEntry {
  readonly expiresAt: number;
  readonly result: AgentCliDiscoveryResult;
}

@Injectable()
export class AgentDiscoveryService {
  private cache: CacheEntry | null = null;
  private inFlight: Promise<AgentCliDiscoveryResult> | null = null;

  constructor(private readonly logger: LoggerService) {}

  /**
   * Probe the allowlisted agent CLIs, returning a cached snapshot within the TTL.
   * Concurrent callers that miss the cache share a single in-flight scan rather
   * than each launching their own full CLI sweep (parity with
   * `NestjsModelDiscoveryService`).
   */
  async discover(): Promise<AgentCliDiscoveryResult> {
    const now = Date.now();
    if (this.cache !== null && now < this.cache.expiresAt) {
      return this.cache.result;
    }

    if (this.inFlight !== null) {
      return this.inFlight;
    }

    const scan = this.scan(now);
    this.inFlight = scan;

    try {
      return await scan;
    } finally {
      if (this.inFlight === scan) {
        this.inFlight = null;
      }
    }
  }

  /** Run a fresh CLI sweep, stamp `scannedAt`, and refresh the cache. */
  private async scan(now: number): Promise<AgentCliDiscoveryResult> {
    const result = await discoverAgentClis({
      scannedAt: new Date().toISOString(),
    });

    this.cache = { expiresAt: now + CACHE_TTL_MS, result };
    const available = result.agents.filter((agent) => agent.available).length;

    this.logger.debug(
      `🤖 agent-discovery: ${available} agent CLI(s) available`,
    );

    return result;
  }
}
