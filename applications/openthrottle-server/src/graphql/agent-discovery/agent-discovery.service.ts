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

  constructor(private readonly logger: LoggerService) {}

  /**
   * Probe the allowlisted agent CLIs, returning a cached snapshot within the TTL.
   */
  async discover(): Promise<AgentCliDiscoveryResult> {
    const now = Date.now();
    if (this.cache !== null && now < this.cache.expiresAt) {
      return this.cache.result;
    }

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
