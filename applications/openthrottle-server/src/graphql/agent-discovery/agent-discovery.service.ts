/**
 * @description Stale-while-revalidate-cached wrapper over the agent-CLI
 * discovery core (openthrottle-agentic-utils). A `--version` sweep is expensive
 * on a cold cache (up to 5 driver spawns at 3s/5s timeouts) but its result
 * changes rarely, so repeat loads serve the last-good snapshot and refresh out
 * of band rather than paying the cold cost. GraphQL-agnostic — the resolver
 * lives alongside.
 *
 * Freshness knobs (ms, read from the environment at construction):
 * - `AGENT_DISCOVERY_CACHE_TTL_MS` — soft TTL; within it a snapshot is served
 *   fresh, past it (but within the hard TTL) it is served stale while a single
 *   coalesced background refresh runs. Default 60_000 (matches model-discovery).
 * - `AGENT_DISCOVERY_HARD_TTL_MS` — hard-staleness bound; past it the next call
 *   blocks on a fresh scan so an idle process never serves stale data forever.
 *   Default 600_000 (10x the soft TTL); clamped up to the soft TTL.
 */

import { Injectable } from '@nestjs/common';
import { LoggerService } from '@openthrottle/nestjs-modules';
import { discoverAgentClis } from '@openthrottle/openthrottle-agentic-utils';
import type { AgentCliDiscoveryResult } from '@openthrottle/openthrottle-agentic-utils';
import { StaleWhileRevalidateCache } from '@openthrottle/openthrottle-agentic-utils';

const DEFAULT_CACHE_TTL_MS = 60_000;
const DEFAULT_HARD_TTL_MS = 600_000;

/** Parse a non-negative integer env value, falling back when unset/invalid. */
function intFromEnv(value: string | undefined, fallback: number): number {
  const parsed = value === undefined ? Number.NaN : Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : fallback;
}

@Injectable()
export class AgentDiscoveryService {
  private readonly cache =
    new StaleWhileRevalidateCache<AgentCliDiscoveryResult>();
  private readonly softTtlMs: number;
  private readonly hardTtlMs: number;

  constructor(private readonly logger: LoggerService) {
    this.softTtlMs = intFromEnv(
      process.env.AGENT_DISCOVERY_CACHE_TTL_MS,
      DEFAULT_CACHE_TTL_MS,
    );
    // Clamped so the hard bound can never be smaller than the soft TTL (which
    // would defeat stale-while-revalidate).
    this.hardTtlMs = Math.max(
      this.softTtlMs,
      intFromEnv(process.env.AGENT_DISCOVERY_HARD_TTL_MS, DEFAULT_HARD_TTL_MS),
    );
  }

  /**
   * Probe the allowlisted agent CLIs with stale-while-revalidate caching. Within
   * the soft TTL the snapshot is served fresh; past it (but within the hard TTL)
   * the last-good snapshot is served immediately while a single coalesced
   * background refresh runs; only the first-ever call and calls past the hard
   * TTL block on a scan.
   */
  discover(): Promise<AgentCliDiscoveryResult> {
    return this.cache.get(() => this.scan(), {
      hardTtlMs: this.hardTtlMs,
      softTtlMs: this.softTtlMs,
    });
  }

  /**
   * Drop the cached snapshot so the next {@link discover} call blocks on a fresh
   * sweep. Called after a successful install/update so newly present (or updated)
   * binaries are reflected immediately rather than after the soft TTL elapses.
   */
  invalidate(): void {
    this.cache.invalidate();
  }

  /** Run a fresh CLI sweep and stamp `scannedAt`. */
  private async scan(): Promise<AgentCliDiscoveryResult> {
    const result = await discoverAgentClis({
      scannedAt: new Date().toISOString(),
    });

    const available = result.agents.filter((agent) => agent.available).length;

    this.logger.debug(
      `🤖 agent-discovery: ${available} agent CLI(s) available`,
    );

    return result;
  }
}
