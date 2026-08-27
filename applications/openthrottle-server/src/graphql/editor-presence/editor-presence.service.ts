/**
 * @description Stale-while-revalidate-cached wrapper over the editor-presence probe
 * (nestjs-repositories). Sibling of AgentDiscoveryService and deliberately shaped like
 * it. The probe is far cheaper than a CLI `--version` sweep — a bundle stat sweep is
 * sub-millisecond — but a total miss falls through to one `mdfind` spawn per editor
 * (~70ms measured), so it still should not run on every page load.
 *
 * Freshness knobs (ms, read from the environment at construction):
 * - `EDITOR_DETECTION_CACHE_TTL_MS` — soft TTL; within it a snapshot is served fresh,
 *   past it (but within the hard TTL) it is served stale while a single coalesced
 *   background refresh runs. Default 60_000 (matches agent-discovery).
 * - `EDITOR_DETECTION_HARD_TTL_MS` — hard-staleness bound; past it the next call blocks
 *   on a fresh probe so an idle process never serves stale data forever. Default
 *   600_000 (10x the soft TTL); clamped up to the soft TTL.
 *
 * The defaults intentionally match agent-discovery rather than being shortened to
 * exploit the cheaper probe: consistency between the two host-probe services is worth
 * more than refreshing an advisory hint sooner.
 */

import { Injectable } from '@nestjs/common';
import { LoggerService } from '@openthrottle/nestjs-modules';
import { detectEditorPresence } from '@openthrottle/nestjs-repositories';
import type { EditorPresenceResult } from '@openthrottle/nestjs-repositories';
import { StaleWhileRevalidateCache } from '@openthrottle/openthrottle-agentic-utils';

const DEFAULT_CACHE_TTL_MS = 60_000;
const DEFAULT_HARD_TTL_MS = 600_000;

/** Parse a non-negative integer env value, falling back when unset/invalid. */
function intFromEnv(value: string | undefined, fallback: number): number {
  const parsed = value === undefined ? Number.NaN : Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : fallback;
}

@Injectable()
export class EditorPresenceService {
  private readonly cache =
    new StaleWhileRevalidateCache<EditorPresenceResult>();
  private readonly softTtlMs: number;
  private readonly hardTtlMs: number;

  constructor(private readonly logger: LoggerService) {
    this.softTtlMs = intFromEnv(
      process.env.EDITOR_DETECTION_CACHE_TTL_MS,
      DEFAULT_CACHE_TTL_MS,
    );
    // Clamped so the hard bound can never be smaller than the soft TTL (which
    // would defeat stale-while-revalidate).
    this.hardTtlMs = Math.max(
      this.softTtlMs,
      intFromEnv(process.env.EDITOR_DETECTION_HARD_TTL_MS, DEFAULT_HARD_TTL_MS),
    );
  }

  /**
   * Probe editor presence with stale-while-revalidate caching. Within the soft TTL the
   * snapshot is served fresh; past it (but within the hard TTL) the last-good snapshot
   * is served immediately while a single coalesced background refresh runs; only the
   * first-ever call and calls past the hard TTL block on a probe.
   */
  detect(): Promise<EditorPresenceResult> {
    return this.cache.get(() => this.scan(), {
      hardTtlMs: this.hardTtlMs,
      softTtlMs: this.softTtlMs,
    });
  }

  /**
   * Drop the cached snapshot so the next {@link detect} call blocks on a fresh probe.
   * For a user who just installed an editor and does not want to wait out the soft TTL.
   */
  invalidate(): void {
    this.cache.invalidate();
  }

  /** Run a fresh probe and stamp `scannedAt`. */
  private async scan(): Promise<EditorPresenceResult> {
    const result = await detectEditorPresence({
      scannedAt: new Date().toISOString(),
    });

    if (!result.trusted) {
      this.logger.debug(
        `🖥️ editor-presence: probe not trusted on this host — reporting unknown for all editors`,
      );
      return result;
    }

    const installed = result.editors.filter(
      (editor) => editor.presence === 'installed',
    ).length;

    this.logger.debug(
      `🖥️ editor-presence: ${installed} of ${result.editors.length} editor(s) detected`,
    );

    return result;
  }
}
