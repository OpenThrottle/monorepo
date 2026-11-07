/**
 * @description Removes the git worktree a programmatic plan run executed in, through the ONE
 * sanctioned entrypoint `pnpm run worktree:remove <path>` (`skills/ot-worktree/scripts/destroy.sh`):
 * it runs the repo's `.worktree/teardown.sh`, removes the worktree and deregisters its checkout row.
 * Never a bare `git worktree remove`, never `--force`, never `--delete-branch` — the branch always
 * survives, so a re-run re-provisions by checking it out again.
 *
 * Guards run in order and the first that applies wins:
 *   1. the path is the base checkout → KEPT_PRIMARY
 *   2. not a linked `plan-<8 hex>` worktree directly under the resolved root → KEPT_NOT_PLAN_RUN_WORKTREE
 *   3. an unsettled plan run points at its checkout → KEPT_ACTIVE_RUN
 *   4. `git status --porcelain` is not empty → KEPT_DIRTY
 *   5. commits exist that neither the upstream nor `origin/<default>` contains → KEPT_UNPUSHED
 *
 * Never throws. A guard that cannot be evaluated reports FAILED and keeps the worktree: when in
 * doubt, the work stays on disk. See docs/openthrottle/plan-run-worktrees.md.
 */

import { dirname } from 'node:path';

import { Injectable } from '@nestjs/common';
import { LoggerService } from '@openthrottle/nestjs-modules';
import type { RepositoryCheckout } from '@openthrottle/nestjs-repositories';
import {
  PlanRunsService,
  RepositoryCheckoutsService,
} from '@openthrottle/nestjs-repositories';
import { In } from 'typeorm';

import { realPath } from '../paths/real-path.ts';
import { isLinkedWorktreeDirectory } from '../worktree-discovery/linked-worktree.ts';
import { resolveWorktreeRoot } from '../worktree-root/worktree-root.resolver.ts';
import { PLAN_RUN_WORKTREE_TEARDOWN_OUTCOME } from './plan-run-worktree-teardown.constants.ts';
import type {
  PlanRunWorktreeAssessment,
  PlanRunWorktreeKeptOutcome,
  PlanRunWorktreeTeardownResult,
  TeardownPlanRunWorktreeParams,
} from './plan-run-worktree-teardown.types.ts';
import type { CommandResult } from './plan-run-worktree-teardown.types.ts';
import {
  isPlanRunWorktreeName,
  primaryCheckoutFromCommonDir,
  runCommand,
  tailOutput,
} from './plan-run-worktree-teardown.utils.ts';

/** `destroy.sh` runs the teardown hook (compose down) before removing; give it room. */
const REMOVE_TIMEOUT_MS = 5 * 60 * 1000;

/** `worktree:serve --stop` signals a process group and waits briefly; it is best-effort. */
const STOP_TIMEOUT_MS = 60 * 1000;

const GIT_TIMEOUT_MS = 30 * 1000;

const WORKTREE_KIND = 'worktree';

/** Used when `refs/remotes/origin/HEAD` is not set (clones made before the remote had commits). */
const FALLBACK_DEFAULT_BRANCH_REF = 'origin/main';

@Injectable()
export class PlanRunWorktreeTeardownService {
  private readonly name = 'plan-run-worktree-teardown';

  /** Serializes teardown per worktree so two callers cannot race on removing the same directory. */
  private readonly inFlight = new Map<
    string,
    Promise<PlanRunWorktreeTeardownResult>
  >();

  constructor(
    private readonly logger: LoggerService,
    private readonly checkoutsService: RepositoryCheckoutsService,
    private readonly planRunsService: PlanRunsService,
  ) {
    this.logger.debug(`🧩 ${this.name} 🧩`);
  }

  /**
   * @description Runs every guard and reports the verdict without removing anything. What a dry-run
   * sweep and a "safe to remove" hint read.
   */
  async assess(
    params: TeardownPlanRunWorktreeParams,
  ): Promise<PlanRunWorktreeAssessment> {
    try {
      return await this.evaluateGuards(params);
    } catch (error) {
      return this.failed(params.worktreePath, error);
    }
  }

  /**
   * @description Removes the worktree when every guard passes, otherwise reports why it was kept.
   * Concurrent calls for the same worktree share one teardown.
   */
  async teardown(
    params: TeardownPlanRunWorktreeParams,
  ): Promise<PlanRunWorktreeTeardownResult> {
    const key = realPath(params.worktreePath);

    const pending = this.inFlight.get(key);
    if (pending !== undefined) {
      return pending;
    }

    const work = this.guardedRemove(params).finally(() => {
      this.inFlight.delete(key);
    });
    this.inFlight.set(key, work);
    return work;
  }

  /**
   * @description The primary checkout a linked worktree belongs to (the parent of its git common
   * dir), or null when the path is not a git checkout. For a caller that knows only the worktree.
   */
  async resolveBaseCheckoutPath(worktreePath: string): Promise<string | null> {
    const common = await this.git(worktreePath, [
      'rev-parse',
      '--path-format=absolute',
      '--git-common-dir',
    ]);
    if (common.exitCode !== 0) return null;
    return primaryCheckoutFromCommonDir(common.stdout.trim());
  }

  private async guardedRemove(
    params: TeardownPlanRunWorktreeParams,
  ): Promise<PlanRunWorktreeTeardownResult> {
    const { baseCheckoutPath, worktreePath } = params;

    const verdict = await this.assess(params);
    if (verdict.outcome !== PLAN_RUN_WORKTREE_TEARDOWN_OUTCOME.REMOVABLE) {
      this.logger.log(
        `[${this.name}] kept ${worktreePath} (${verdict.outcome}): ${verdict.detail}`,
      );
      return verdict;
    }

    await this.stopServedProcesses(worktreePath);

    const removed = await runCommand(
      'pnpm',
      ['run', 'worktree:remove', worktreePath],
      { cwd: baseCheckoutPath, timeout: REMOVE_TIMEOUT_MS },
    );
    if (removed.exitCode !== 0) {
      const detail = `worktree:remove exited ${removed.exitCode}: ${tailOutput(removed.stderr)}`;
      this.logger.warn(`[${this.name}] ${worktreePath}: ${detail}`);
      return {
        detail,
        outcome: PLAN_RUN_WORKTREE_TEARDOWN_OUTCOME.FAILED,
        worktreePath,
      };
    }

    await this.deregisterLeftoverCheckouts(worktreePath);

    this.logger.log(
      `[${this.name}] removed ${worktreePath}; branch ${verdict.branch ?? '(detached)'} kept`,
    );
    return {
      branch: verdict.branch,
      outcome: PLAN_RUN_WORKTREE_TEARDOWN_OUTCOME.REMOVED,
      worktreePath,
    };
  }

  private async evaluateGuards(
    params: TeardownPlanRunWorktreeParams,
  ): Promise<PlanRunWorktreeAssessment> {
    const { baseCheckoutPath, worktreePath } = params;
    const resolved = realPath(worktreePath);

    if (resolved === realPath(baseCheckoutPath)) {
      return this.kept(
        worktreePath,
        PLAN_RUN_WORKTREE_TEARDOWN_OUTCOME.KEPT_PRIMARY,
        'it is the base checkout, never a plan-run worktree',
      );
    }

    const identity = this.checkPlanRunWorktreeIdentity(
      resolved,
      baseCheckoutPath,
    );
    if (identity !== null) {
      return this.kept(
        worktreePath,
        PLAN_RUN_WORKTREE_TEARDOWN_OUTCOME.KEPT_NOT_PLAN_RUN_WORKTREE,
        identity,
      );
    }

    if (await this.hasUnsettledRun(worktreePath)) {
      return this.kept(
        worktreePath,
        PLAN_RUN_WORKTREE_TEARDOWN_OUTCOME.KEPT_ACTIVE_RUN,
        'an unsettled plan run still points at its checkout',
      );
    }

    const status = await this.git(worktreePath, ['status', '--porcelain']);
    if (status.exitCode !== 0) {
      throw new Error(`git status failed: ${tailOutput(status.stderr)}`);
    }
    if (status.stdout.trim() !== '') {
      return this.kept(
        worktreePath,
        PLAN_RUN_WORKTREE_TEARDOWN_OUTCOME.KEPT_DIRTY,
        'it has uncommitted changes',
      );
    }

    const unpushed = await this.describeUnpushedWork(worktreePath);
    if (unpushed !== null) {
      return this.kept(
        worktreePath,
        PLAN_RUN_WORKTREE_TEARDOWN_OUTCOME.KEPT_UNPUSHED,
        unpushed,
      );
    }

    return {
      branch: await this.readBranch(worktreePath),
      outcome: PLAN_RUN_WORKTREE_TEARDOWN_OUTCOME.REMOVABLE,
      worktreePath,
    };
  }

  /**
   * @description Null when the path is a linked worktree named `plan-<8 hex>` directly under the
   * resolved worktree root; otherwise the reason it is not one.
   */
  private checkPlanRunWorktreeIdentity(
    resolvedWorktreePath: string,
    baseCheckoutPath: string,
  ): string | null {
    if (!isLinkedWorktreeDirectory(resolvedWorktreePath)) {
      return 'it is not a linked git worktree';
    }
    if (!isPlanRunWorktreeName(resolvedWorktreePath)) {
      return 'its name is not plan-<8 hex>, so the server did not provision it';
    }

    const root = resolveWorktreeRoot({ baseCheckoutPath }).resolvedRoot;
    if (dirname(resolvedWorktreePath) !== realPath(root)) {
      return `it is not directly under the worktree root ${root}`;
    }
    return null;
  }

  /** The guard WorktreeCheckoutPruneService uses: a QUEUED or IN_PROGRESS run on its checkout. */
  private async hasUnsettledRun(worktreePath: string): Promise<boolean> {
    const checkouts = await this.findWorktreeCheckouts(worktreePath);
    if (checkouts.length === 0) return false;

    const runs = await this.planRunsService.findUnsettledRunsByCheckoutIds(
      checkouts.map((checkout) => checkout.id),
    );
    return runs.length > 0;
  }

  /**
   * @description Null when every commit on HEAD is already on a remote: the upstream exists with
   * nothing ahead of it, or HEAD is an ancestor of `origin/<default>`. Otherwise the reason.
   */
  private async describeUnpushedWork(
    worktreePath: string,
  ): Promise<string | null> {
    const upstream = await this.git(worktreePath, [
      'rev-parse',
      '--abbrev-ref',
      '--symbolic-full-name',
      '@{u}',
    ]);
    if (upstream.exitCode === 0) {
      const ahead = await this.git(worktreePath, [
        'rev-list',
        '--count',
        '@{u}..HEAD',
      ]);
      if (ahead.exitCode === 0 && ahead.stdout.trim() === '0') return null;
    }

    const defaultRef = await this.readDefaultBranchRef(worktreePath);
    const contained = await this.git(worktreePath, [
      'merge-base',
      '--is-ancestor',
      'HEAD',
      defaultRef,
    ]);
    if (contained.exitCode === 0) return null;

    if (upstream.exitCode !== 0) {
      return `it has commits that are not pushed (no upstream, not contained in ${defaultRef})`;
    }
    return `it has commits ahead of ${upstream.stdout.trim()} that are not pushed`;
  }

  private async readDefaultBranchRef(worktreePath: string): Promise<string> {
    const head = await this.git(worktreePath, [
      'symbolic-ref',
      '--short',
      'refs/remotes/origin/HEAD',
    ]);
    const ref = head.stdout.trim();
    return head.exitCode === 0 && ref !== ''
      ? ref
      : FALLBACK_DEFAULT_BRANCH_REF;
  }

  private async readBranch(worktreePath: string): Promise<string | null> {
    const branch = await this.git(worktreePath, [
      'rev-parse',
      '--abbrev-ref',
      'HEAD',
    ]);
    const name = branch.stdout.trim();
    if (branch.exitCode !== 0 || name === '' || name === 'HEAD') return null;
    return name;
  }

  /**
   * @description `pnpm worktree:serve --stop` from inside the worktree, which signals only the
   * processes its pidfiles or cwd tie to that worktree. Best-effort: nothing may be running.
   */
  private async stopServedProcesses(worktreePath: string): Promise<void> {
    const stopped = await runCommand(
      'pnpm',
      ['run', 'worktree:serve', '--stop'],
      { cwd: worktreePath, timeout: STOP_TIMEOUT_MS },
    );
    if (stopped.exitCode !== 0) {
      this.logger.warn(
        `[${this.name}] worktree:serve --stop in ${worktreePath} exited ${stopped.exitCode}; continuing`,
      );
    }
  }

  /**
   * @description `destroy.sh` deregisters the checkout row over HTTP, fail-open. Deleting any row
   * that survived makes the outcome independent of whether that call reached a server. Best-effort.
   */
  private async deregisterLeftoverCheckouts(
    worktreePath: string,
  ): Promise<void> {
    try {
      const leftovers = await this.findWorktreeCheckouts(worktreePath);
      await Promise.all(
        leftovers.map((checkout) =>
          this.checkoutsService.deleteWorktreeCheckout(
            checkout.userId,
            checkout.id,
          ),
        ),
      );
    } catch (error) {
      this.logger.warn(
        `[${this.name}] could not deregister checkout rows for ${worktreePath}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  /** Worktree checkout rows at the path, matched as given and by real path (either may be stored). */
  private async findWorktreeCheckouts(
    worktreePath: string,
  ): Promise<RepositoryCheckout[]> {
    const paths = [...new Set([worktreePath, realPath(worktreePath)])];
    return this.checkoutsService.getRepository().find({
      where: { filesystemPath: In(paths), kind: WORKTREE_KIND },
    });
  }

  private async git(
    worktreePath: string,
    args: readonly string[],
  ): Promise<CommandResult> {
    return runCommand('git', ['-C', worktreePath, ...args], {
      cwd: worktreePath,
      timeout: GIT_TIMEOUT_MS,
    });
  }

  private kept(
    worktreePath: string,
    outcome: PlanRunWorktreeKeptOutcome,
    detail: string,
  ): PlanRunWorktreeAssessment {
    return { detail, outcome, worktreePath };
  }

  private failed(
    worktreePath: string,
    error: unknown,
  ): PlanRunWorktreeAssessment {
    const message = error instanceof Error ? error.message : String(error);
    return {
      detail: `could not evaluate the guards: ${message}`,
      outcome: PLAN_RUN_WORKTREE_TEARDOWN_OUTCOME.FAILED,
      worktreePath,
    };
  }
}
