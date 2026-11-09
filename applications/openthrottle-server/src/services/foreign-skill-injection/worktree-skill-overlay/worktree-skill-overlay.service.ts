import { existsSync } from 'node:fs';
import { join } from 'node:path';

import { Injectable } from '@nestjs/common';
import { LoggerService } from '@openthrottle/nestjs-modules';
import { RepositoryCheckoutsService } from '@openthrottle/nestjs-repositories';
import {
  ensureMaterialized,
  FOREIGN_SKILL_MATERIALIZATION_LAYER,
  resolveForeignWorkspaceContext,
  teardown,
} from '@openthrottle/openthrottle-agentic-utils';

import {
  WORKTREE_SKILL_OVERLAY_SKILL_NAME,
  WORKTREE_SKILL_OVERLAY_STATUS,
} from './worktree-skill-overlay.constants.ts';
import type {
  EnsureWorktreeSkillOverlayParams,
  WorktreeSkillOverlayOutcome,
} from './worktree-skill-overlay.types.ts';

const LAYER = FOREIGN_SKILL_MATERIALIZATION_LAYER.WORKTREE_OVERLAY;

/**
 * @description The `ot-worktree` overlay: OpenThrottle's guarantee that its worktree skill is present
 * in any foreign repo it provisions plan-run worktrees for. **Default on, per-checkout opt-out**
 * (`repository_checkouts.worktree_skill_overlay_enabled`), independent of the opt-in curated set
 * (`foreign_skill_injection_enabled`) — it materializes into its own ledger and `.git/info/exclude`
 * block, so neither layer's teardown touches the other.
 *
 * It never fails a run. Opted out, nothing is written; an overlay error is a warning. Either way the
 * provisioner still finds `create.sh` through the resolver's last rung, the server's own copy
 * (`services/ot-worktree-script`). The overlay is what makes the skill visible to agents working in
 * the repo; provisioning does not depend on it.
 *
 * Applied lazily, before each plan-run worktree is provisioned, rather than reconciled at boot: the
 * boot reaper tears every ledgered layer down (crash recovery), and the next provisioning restores it.
 */
@Injectable()
export class WorktreeSkillOverlayService {
  private readonly name = 'worktree-skill-overlay';

  constructor(
    private readonly logger: LoggerService,
    private readonly checkoutsService: RepositoryCheckoutsService,
  ) {}

  /**
   * @description Ensures the overlay before a plan-run worktree is created from `baseCheckoutPath`,
   * honouring the acting user's opt-out. Never throws. An unregistered checkout or an unresolvable
   * user gets the default: on.
   */
  async ensureForBaseCheckout(
    params: EnsureWorktreeSkillOverlayParams,
  ): Promise<WorktreeSkillOverlayOutcome> {
    const { actorUserId, baseCheckoutPath } = params;

    const openThrottleRoot = this.foreignOpenThrottleRoot(baseCheckoutPath);
    if (openThrottleRoot === null) {
      return {
        baseCheckoutPath,
        status: WORKTREE_SKILL_OVERLAY_STATUS.NOT_FOREIGN,
      };
    }

    if (await this.isOptedOut(actorUserId, baseCheckoutPath)) {
      this.removeFromPath(baseCheckoutPath);
      this.logger.log(
        `[${this.name}] ${baseCheckoutPath} opted out of the ot-worktree overlay; provisioning uses the server's own ot-worktree scripts (openthrottle-ssot rung)`,
      );
      return {
        baseCheckoutPath,
        status: WORKTREE_SKILL_OVERLAY_STATUS.OPTED_OUT,
      };
    }

    return this.applyToPath(baseCheckoutPath, openThrottleRoot);
  }

  /**
   * @description Apply-now side of the per-checkout toggle: adds (enabled) or removes (disabled) the
   * overlay across every one of the user's foreign checkouts of a repository. Per-checkout soft-fail.
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
      const path = checkout.filesystemPath;
      const openThrottleRoot = this.foreignOpenThrottleRoot(path);
      if (openThrottleRoot === null) continue;

      if (enabled) {
        this.applyToPath(path, openThrottleRoot);
      } else {
        this.removeFromPath(path);
      }
    }
  }

  /**
   * The OT root when `path` is a foreign git checkout, else null. A directory without `.git` is not
   * a checkout: nothing could hide the overlay from it, and the worktree create would fail anyway.
   */
  private foreignOpenThrottleRoot(path: string): string | null {
    if (!existsSync(join(path, '.git'))) return null;

    const foreign = resolveForeignWorkspaceContext(path, process.env);
    if (!foreign.isForeign || foreign.openThrottleRoot === undefined) {
      return null;
    }
    return foreign.openThrottleRoot;
  }

  /** True only when the acting user's checkout row explicitly opts out; a failed lookup is "on". */
  private async isOptedOut(
    actorUserId: string | null,
    baseCheckoutPath: string,
  ): Promise<boolean> {
    const userId = actorUserId?.trim() ?? '';
    if (userId === '') return false;

    try {
      const checkout = await this.checkoutsService.findByUserAndPath(
        userId,
        baseCheckoutPath,
      );
      return checkout?.worktreeSkillOverlayEnabled === false;
    } catch (error) {
      this.logger.warn(
        `[${this.name}] could not read the overlay flag for ${baseCheckoutPath}; treating it as on: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return false;
    }
  }

  private applyToPath(
    repoPath: string,
    openThrottleRoot: string,
  ): WorktreeSkillOverlayOutcome {
    try {
      const result = ensureMaterialized({
        env: process.env,
        layer: LAYER,
        onlySkillNames: [WORKTREE_SKILL_OVERLAY_SKILL_NAME],
        otCuratedSkillsDir: join(openThrottleRoot, 'skills'),
        repoPath,
      });
      for (const warning of result.warnings) {
        this.logger.warn(`[${this.name}] ${repoPath}: ${warning}`);
      }
      return {
        baseCheckoutPath: repoPath,
        injectedNames: result.injectedNames,
        status: WORKTREE_SKILL_OVERLAY_STATUS.APPLIED,
      };
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `[${this.name}] overlay failed for ${repoPath}; provisioning falls back to the server's own ot-worktree scripts: ${reason}`,
      );
      return {
        baseCheckoutPath: repoPath,
        reason,
        status: WORKTREE_SKILL_OVERLAY_STATUS.FAILED,
      };
    }
  }

  private removeFromPath(repoPath: string): void {
    try {
      teardown({ env: process.env, layer: LAYER, repoPath });
    } catch (error) {
      this.logger.warn(
        `[${this.name}] overlay teardown failed for ${repoPath}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }
}
