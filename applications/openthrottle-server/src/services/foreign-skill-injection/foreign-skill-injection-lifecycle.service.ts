import { Injectable, type OnApplicationShutdown } from '@nestjs/common';
import { LoggerService } from '@openthrottle/nestjs-modules';
import {
  listLedgerPaths,
  readLedger,
  teardown,
} from '@openthrottle/openthrottle-agentic-utils';

/**
 * @description Server-scoped lifecycle for foreign-skill injection. The injected skill layer lives
 * inside consumers' repos for the lifetime of the OpenThrottle server (materialized lazily per repo
 * on first foreign run, reused across runs); this service reconciles that layer at the two ends of
 * the server's life:
 *
 * - **Graceful shutdown** ({@link onApplicationShutdown}): tear the layer down so it never outlives
 *   the server.
 * - **Crash recovery** ({@link reapStrandedLedgers}): a boot-time sweep that removes layers stranded
 *   by a prior server/run that died before its shutdown teardown ran. Invoked from the existing
 *   stale-run sweep boot lifecycle (not a bespoke marker system) — boot-once, so it never removes a
 *   ledger the currently-running server is actively reusing.
 *
 * Both paths share the same ledger-driven, still-OT-owned-only teardown (see the materializer's
 * `teardown`): exactly the recorded paths are removed, and only while they remain identifiably
 * OT-injected — a target-owned or user-created path is never touched, even under a stale ledger.
 */
@Injectable()
export class ForeignSkillInjectionLifecycleService implements OnApplicationShutdown {
  constructor(private readonly logger: LoggerService) {}

  /** Ledger-driven teardown of every ledgered repo; returns how many were reconciled. */
  private sweepLedgeredRepos(): number {
    const ledgerPaths = listLedgerPaths(process.env);
    let reconciled = 0;
    for (const ledgerPath of ledgerPaths) {
      const ledger = readLedger(ledgerPath);
      if (ledger === undefined) {
        continue;
      }
      try {
        teardown({ env: process.env, repoPath: ledger.repoPath });
        reconciled += 1;
      } catch (error) {
        this.logger.warn(
          `Foreign-skill teardown failed for ${ledger.repoPath}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }
    return reconciled;
  }

  /**
   * @description Boot-time crash recovery: removes any foreign-skill layer left behind by a prior
   * server/run that never reached graceful shutdown. Safe to run at boot because no run of the
   * current server has materialized a layer yet, so every on-disk ledger is stranded.
   */
  reapStrandedLedgers(): void {
    const reaped = this.sweepLedgeredRepos();
    if (reaped > 0) {
      this.logger.log(
        `Foreign-skill injection: reaped ${reaped} stranded repo layer(s) on boot`,
      );
    }
  }

  onApplicationShutdown(): void {
    const torndown = this.sweepLedgeredRepos();
    if (torndown > 0) {
      this.logger.log(
        `Foreign-skill injection: tore down ${torndown} repo layer(s) on shutdown`,
      );
    }
  }
}
