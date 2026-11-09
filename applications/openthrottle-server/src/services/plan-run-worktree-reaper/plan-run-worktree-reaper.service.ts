/**
 * @description The backstop for plan-run worktrees that teardown-on-PR skipped — a handoff-owed,
 * failed, cancelled or opted-out run, a plan set to keep, or anything from before teardown existed.
 *
 * The sweep only NOMINATES. Each tick it finds the server-provisioned `plan-<8>` worktrees on disk
 * (through WorktreeDiscoveryService, the same view /settings/repositories shows) and nominates one
 * when its PR is merged or closed, its plan is gone, its plan is terminal and idle past the age
 * floor, or it holds nothing beyond the default branch and is idle past the age floor. Every
 * nominee then goes to PlanRunWorktreeTeardownService, whose guards (clean, pushed, no live run,
 * really a plan-run worktree) are the authority: a dirty or unpushed worktree is nominated and
 * kept, never removed.
 *
 * Dry-run by default: `assess()` only, nothing removed, and the candidate list is logged and
 * raised as a system alert so it can be checked against the real worktree set first.
 */

import { Injectable } from '@nestjs/common';
import { LoggerService } from '@openthrottle/nestjs-modules';
import type { Plan } from '@openthrottle/nestjs-repositories';
import {
  PlanRunsService,
  PlansService,
  RepositoryCheckoutsService,
} from '@openthrottle/nestjs-repositories';
import { Raw } from 'typeorm';

import { NotificationsService } from '../../notifications/notifications.service.ts';
import { PLAN_RUN_WORKTREE_TEARDOWN_OUTCOME } from '../plan-run-worktree-teardown/plan-run-worktree-teardown.constants.ts';
import { PlanRunWorktreeTeardownService } from '../plan-run-worktree-teardown/plan-run-worktree-teardown.service.ts';
import type {
  PlanRunWorktreeAssessment,
  PlanRunWorktreeTeardownResult,
  TeardownPlanRunWorktreeParams,
} from '../plan-run-worktree-teardown/plan-run-worktree-teardown.types.ts';
import {
  isPlanRunWorktreeName,
  primaryCheckoutFromCommonDir,
  runCommand,
} from '../plan-run-worktree-teardown/plan-run-worktree-teardown.utils.ts';
import { WorktreeDiscoveryService } from '../worktree-discovery/worktree-discovery.service.ts';
import type { DiscoveredWorktree } from '../worktree-discovery/worktree-discovery.types.ts';
import {
  PLAN_RUN_WORKTREE_NOMINATION,
  PLAN_RUN_WORKTREE_REAPER_AGE_FLOOR_MS,
  PLAN_RUN_WORKTREE_REAPER_MAX_REMOVALS_PER_TICK,
  PLAN_RUN_WORKTREE_REAPER_TERMINAL_PLAN_STATUSES,
} from './plan-run-worktree-reaper.constants.ts';
import type {
  PlanRunWorktreeCandidate,
  PlanRunWorktreeNomination,
  PlanRunWorktreeReaperEntry,
  PlanRunWorktreeReaperSummary,
  PlanRunWorktreeReaperSweepOptions,
} from './plan-run-worktree-reaper.types.ts';
import {
  describePlanRunWorktreeReaperSummary,
  planIdPrefixFromWorktreeName,
} from './plan-run-worktree-reaper.utils.ts';

const PROBE_TIMEOUT_MS = 30 * 1000;

const FALLBACK_DEFAULT_BRANCH_REF = 'origin/main';

@Injectable()
export class PlanRunWorktreeReaperService {
  private readonly name = 'plan-run-worktree-reaper';

  constructor(
    private readonly logger: LoggerService,
    private readonly checkoutsService: RepositoryCheckoutsService,
    private readonly discovery: WorktreeDiscoveryService,
    private readonly notifications: NotificationsService,
    private readonly planRunsService: PlanRunsService,
    private readonly plansService: PlansService,
    private readonly teardownService: PlanRunWorktreeTeardownService,
  ) {
    this.logger.debug(`🧩 ${this.name} 🧩`);
  }

  /**
   * @description One tick: discover, nominate, then assess (dry run) or tear down (live, capped)
   * each nominee in order. Logs a summary and raises it as a system alert when anything was
   * nominated.
   */
  async sweep(
    options: PlanRunWorktreeReaperSweepOptions,
  ): Promise<PlanRunWorktreeReaperSummary> {
    const candidates = await this.discoverCandidates();
    const nominations = await Promise.all(
      candidates.map((candidate) => this.nominate(candidate, options.now)),
    );

    const nominees = candidates.flatMap((candidate, index) => {
      const nomination = nominations[index];
      if (nomination?.kind !== 'nominated') return [];
      return [{ candidate, reason: nomination.reason }];
    });

    const entries: PlanRunWorktreeReaperEntry[] = [];
    let removed = 0;
    let deferred = 0;

    for (const nominee of nominees) {
      if (removed >= PLAN_RUN_WORKTREE_REAPER_MAX_REMOVALS_PER_TICK) {
        deferred += 1;
        continue;
      }

      const params = {
        baseCheckoutPath: nominee.candidate.baseCheckoutPath,
        worktreePath: nominee.candidate.worktreePath,
      };
      // eslint-disable-next-line no-await-in-loop -- deliberate: one removal at a time, so the per-tick cap counts real removals and two teardown hooks never run at once
      const verdict = await this.judge(params, options.dryRun);

      if (verdict.outcome === PLAN_RUN_WORKTREE_TEARDOWN_OUTCOME.REMOVED) {
        removed += 1;
      }
      entries.push({ ...nominee, verdict });
    }

    const summary: PlanRunWorktreeReaperSummary = {
      deferred,
      dryRun: options.dryRun,
      examined: candidates.length,
      nominated: entries,
      removed,
    };
    this.report(summary);
    return summary;
  }

  /** A dry run only assesses; a live run tears down. */
  private async judge(
    params: TeardownPlanRunWorktreeParams,
    dryRun: boolean,
  ): Promise<PlanRunWorktreeAssessment | PlanRunWorktreeTeardownResult> {
    if (dryRun) return this.teardownService.assess(params);
    return this.teardownService.teardown(params);
  }

  /**
   * @description Every `plan-<8 hex>` worktree discovery finds for any user, deduped on path, with
   * its primary checkout derived from the git common dir. Worktrees whose primary cannot be derived
   * are skipped: the ot-worktree destroy action has nowhere to run from.
   */
  private async discoverCandidates(): Promise<PlanRunWorktreeCandidate[]> {
    const checkouts = await this.checkoutsService.findAll();
    const userIds = [...new Set(checkouts.map((checkout) => checkout.userId))];
    const results = await Promise.all(
      userIds.map((userId) => this.discovery.discover(userId)),
    );

    const byPath = new Map<string, PlanRunWorktreeCandidate>();
    for (const worktree of results.flatMap((result) => result.worktrees)) {
      const candidate = this.toCandidate(worktree);
      if (candidate !== null) byPath.set(candidate.worktreePath, candidate);
    }
    return [...byPath.values()];
  }

  private toCandidate(
    worktree: DiscoveredWorktree,
  ): PlanRunWorktreeCandidate | null {
    if (!isPlanRunWorktreeName(worktree.path)) return null;

    const baseCheckoutPath = primaryCheckoutFromCommonDir(worktree.commonDir);
    if (baseCheckoutPath === null) return null;

    return {
      baseCheckoutPath,
      branch: worktree.branch,
      name: worktree.name,
      worktreePath: worktree.path,
    };
  }

  private async nominate(
    candidate: PlanRunWorktreeCandidate,
    now: Date,
  ): Promise<PlanRunWorktreeNomination> {
    try {
      return await this.evaluateNomination(candidate, now);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        detail: `could not evaluate: ${message}`,
        kind: 'not-nominated',
      };
    }
  }

  private async evaluateNomination(
    candidate: PlanRunWorktreeCandidate,
    now: Date,
  ): Promise<PlanRunWorktreeNomination> {
    const prState = await this.readPrState(candidate);
    if (prState === 'MERGED') {
      return {
        kind: 'nominated',
        reason: PLAN_RUN_WORKTREE_NOMINATION.PR_MERGED,
      };
    }
    if (prState === 'CLOSED') {
      return {
        kind: 'nominated',
        reason: PLAN_RUN_WORKTREE_NOMINATION.PR_CLOSED,
      };
    }

    const plans = await this.findPlansForWorktree(candidate.name);
    if (plans.length === 0) {
      return {
        kind: 'nominated',
        reason: PLAN_RUN_WORKTREE_NOMINATION.PLAN_MISSING,
      };
    }
    const [plan] = plans;
    if (plans.length > 1 || plan === undefined) {
      return {
        detail: 'its plan-id prefix matches more than one plan',
        kind: 'not-nominated',
      };
    }

    const isIdle = await this.isIdlePastAgeFloor(plan, now);
    if (!isIdle) {
      return { detail: 'its plan was active recently', kind: 'not-nominated' };
    }
    if (PLAN_RUN_WORKTREE_REAPER_TERMINAL_PLAN_STATUSES.includes(plan.status)) {
      return {
        kind: 'nominated',
        reason: PLAN_RUN_WORKTREE_NOMINATION.PLAN_TERMINAL_IDLE,
      };
    }
    if (await this.hasNoWorkBeyondDefaultBranch(candidate.worktreePath)) {
      return {
        kind: 'nominated',
        reason: PLAN_RUN_WORKTREE_NOMINATION.NO_WORK_IDLE,
      };
    }
    return {
      detail: 'its plan is not terminal and it holds work',
      kind: 'not-nominated',
    };
  }

  /** `gh pr view <branch>` state, or null when there is no PR, no branch, or gh is unavailable. */
  private async readPrState(
    candidate: PlanRunWorktreeCandidate,
  ): Promise<string | null> {
    if (candidate.branch === null) return null;

    const result = await runCommand(
      'gh',
      ['pr', 'view', candidate.branch, '--json', 'state', '--jq', '.state'],
      { cwd: candidate.worktreePath, timeout: PROBE_TIMEOUT_MS },
    );
    const state = result.stdout.trim();
    if (result.exitCode !== 0 || state === '') return null;
    return state;
  }

  private async findPlansForWorktree(name: string): Promise<Plan[]> {
    const prefix = planIdPrefixFromWorktreeName(name);
    return this.plansService.getRepository().find({
      take: 2,
      where: {
        id: Raw((alias) => `CAST(${alias} AS text) LIKE :prefix`, {
          prefix: `${prefix}%`,
        }),
      },
    });
  }

  /** Idle when neither the plan nor its latest run changed within the age floor. */
  private async isIdlePastAgeFloor(plan: Plan, now: Date): Promise<boolean> {
    const [latestRun] = await this.planRunsService.findRecentByPlanId(
      plan.id,
      1,
    );
    const lastActivity = Math.max(
      plan.updatedAt.getTime(),
      latestRun?.updatedAt.getTime() ?? 0,
    );
    return (
      now.getTime() - lastActivity >= PLAN_RUN_WORKTREE_REAPER_AGE_FLOOR_MS
    );
  }

  /** True when HEAD has no commits that `origin/<default>` lacks. */
  private async hasNoWorkBeyondDefaultBranch(
    worktreePath: string,
  ): Promise<boolean> {
    const options = { cwd: worktreePath, timeout: PROBE_TIMEOUT_MS };
    const head = await runCommand(
      'git',
      [
        '-C',
        worktreePath,
        'symbolic-ref',
        '--short',
        'refs/remotes/origin/HEAD',
      ],
      options,
    );
    const symbolic = head.stdout.trim();
    const hasSymbolicRef = head.exitCode === 0 && symbolic !== '';
    const defaultRef = hasSymbolicRef ? symbolic : FALLBACK_DEFAULT_BRANCH_REF;

    const ahead = await runCommand(
      'git',
      ['-C', worktreePath, 'rev-list', '--count', `${defaultRef}..HEAD`],
      options,
    );
    return ahead.exitCode === 0 && ahead.stdout.trim() === '0';
  }

  private report(summary: PlanRunWorktreeReaperSummary): void {
    const text = describePlanRunWorktreeReaperSummary(summary);
    this.logger.log(text);

    if (summary.nominated.length === 0) return;
    this.notifications.emitSystemAlert({
      code: 'plan-run-worktree-reaper',
      message: text,
      severity: 'info',
    });
  }
}
