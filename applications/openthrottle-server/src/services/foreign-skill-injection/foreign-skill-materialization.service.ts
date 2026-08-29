import { Injectable } from '@nestjs/common';
import { LoggerService } from '@openthrottle/nestjs-modules';
import { RepositoryCheckoutsService } from '@openthrottle/nestjs-repositories';
import {
  ensureMaterialized,
  resolveForeignWorkspaceContext,
  resolvePersonalSkillsDir,
  teardown,
} from '@openthrottle/openthrottle-agentic-utils';
import { join } from 'node:path';

/**
 * @description On-demand "apply now" side of the per-checkout foreign-skill injection toggle.
 * Turning injection on/off for a repository projects (enabled) or removes (disabled) OpenThrottle's
 * curated skills into every one of that user's checkouts immediately, without waiting for a run — so
 * the switch takes effect the moment it is saved. Complements the run-time gate in
 * {@link AgenticRalphOrchestratorService}, which stays the backstop (re-materializes on the next run
 * after a server restart clears the layer, and covers worktrees created later).
 *
 * Per-checkout soft-fail: only foreign checkouts are touched (the OT monorepo already has its skills),
 * and a filesystem problem is logged, never thrown, so the settings mutation still succeeds. Both
 * paths are idempotent (`ensureMaterialized` is a no-op when already present; `teardown` removes only
 * ledgered OT-owned paths and is a no-op when nothing was injected).
 */
@Injectable()
export class ForeignSkillMaterializationService {
  constructor(
    private readonly logger: LoggerService,
    private readonly checkoutsService: RepositoryCheckoutsService,
  ) {}

  /**
   * @description Applies the toggle to disk across all of the user's checkouts of a repository.
   */
  async applyForRepository(
    userId: string,
    repositoryId: string,
    enabled: boolean,
  ): Promise<void> {
    const checkouts = await this.checkoutsService.findByRepositoryIdForUser(
      repositoryId,
      userId,
    );
    for (const checkout of checkouts) {
      this.applyForPath(checkout.filesystemPath, enabled);
    }
  }

  /**
   * @description Boot reconcile: re-projects the layer into every checkout whose flag says it should
   * have one, and returns how many were reconciled. Without this the flag and the disk disagree
   * after every restart — shutdown teardown and the boot reaper clear the layer, and only a later
   * run or a toggle would restore it, so someone opening their editor in an opted-in repo after a
   * restart would find OT's skills missing.
   *
   * Must run AFTER the boot reaper, which clears stranded ledgers; re-materializing first would
   * simply be undone. Idempotent (`ensureMaterialized` no-ops when the layer is present) and
   * per-checkout soft-fail, so one bad path never blocks the rest or boot itself.
   */
  async remateralizeEnabledCheckouts(): Promise<number> {
    const checkouts =
      await this.checkoutsService.findAllWithForeignSkillInjectionEnabled();
    for (const checkout of checkouts) {
      this.applyForPath(checkout.filesystemPath, true);
    }
    return checkouts.length;
  }

  private applyForPath(repoPath: string, enabled: boolean): void {
    const foreign = resolveForeignWorkspaceContext(repoPath, process.env);
    if (!foreign.isForeign || foreign.openThrottleRoot === undefined) {
      // Injection only applies to foreign checkouts; the OT monorepo already carries its own skills.
      return;
    }

    try {
      if (enabled) {
        const result = ensureMaterialized({
          env: process.env,
          otCuratedSkillsDir: join(foreign.openThrottleRoot, 'skills'),
          personalSkillsDir: resolvePersonalSkillsDir(process.env),
          repoPath,
        });
        for (const warning of result.warnings) {
          this.logger.warn(`Foreign-skill apply: ${warning}`);
        }
      } else {
        teardown({ env: process.env, repoPath });
      }
    } catch (error) {
      this.logger.warn(
        `Foreign-skill ${enabled ? 'materialize' : 'teardown'} failed for ${repoPath}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }
}
