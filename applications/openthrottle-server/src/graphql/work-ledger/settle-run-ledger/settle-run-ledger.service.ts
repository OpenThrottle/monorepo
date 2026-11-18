/**
 * @description Records a plan run's git artifacts at settle time, server-side.
 *
 * WHY THIS IS A MECHANISM AND NOT A DOCUMENT
 *
 * The obligation to record a git_commit artifact was written into eight different documents and
 * produced 38 artifacts ever, none since August, against 197 plans with landed work. Rewriting an
 * instruction that was not followed with a differently-worded instruction is not a fix. So the
 * server does it, on a call the agent already has to make.
 *
 * settleCliPlanRun is the loop's mandatory last call — nothing server-side settles a detached-CLI
 * run, so every exit path goes through here, and the COMPLETED path runs immediately after the PR
 * opens while the run row is still addressable. Everything else needed is already on plan_runs:
 * plan_id, checkout_id and actor_user_id.
 *
 * WHY BOTH ARTIFACT TYPES
 *
 * The PR number survives a rebase or an amend; the branch sha does not. Artifacts are already
 * orphaned from exactly that: recorded at PR-open, branch rebased before merge, then GitHub could
 * not find the sha and the row aged out. The pull_request sibling gives the verifier a rebase-proof
 * anchor to repair the git_commit from.
 *
 * WHY THE SERVER RESOLVES THE REPO
 *
 * There are two remotes — `origin` (canonical) and an `openthrottle` mirror with unrelated history
 * — so an agent deriving owner/repo from `git remote` can pick the wrong one and write an
 * external_key that never verifies. checkout_id -> repository_id -> repositories.name is unambiguous,
 * and `name` is already stored as `owner/repo`. A service-account run has no checkout (nothing
 * owns one without a user), so it falls back to the snapshot's repositoryId and then to the
 * working directory's remote matched against registered repositories — see resolveRepoName.
 *
 * Best-effort throughout, like the neighbouring WorkLedgerRunService: ledger bookkeeping must never
 * be the reason a run fails to settle. Every failure is logged and swallowed.
 */
import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { LoggerService } from '@openthrottle/nestjs-modules';
import {
  RepositoriesService,
  RepositoryCheckoutsService,
} from '@openthrottle/nestjs-repositories';
import type { PlanRun } from '@openthrottle/nestjs-repositories-server';
import type { WorkArtifactSource } from '@openthrottle/nestjs-repositories-server';
import {
  PLAN_RUN_STATUS,
  PlanRunsRepository,
} from '@openthrottle/nestjs-repositories-server';
import {
  ServiceAccountsRepository,
  WORK_ARTIFACT_SOURCE,
  WorkArtifact,
  WorkArtifactsRepository,
  WorkSession,
  WorkSessionSubject,
} from '@openthrottle/nestjs-repositories-server';
import { DataSource } from 'typeorm';

import { DEFAULT_FORGE_KIND } from '../../../services/source-control/source-control.constants.ts';
import { SourceControlService } from '../../../services/source-control/source-control.service.ts';
import type { ForgeRepoRef } from '../../../services/source-control/source-control.types.ts';
import { repoPayloadFields } from '../../../services/source-control/source-control.utils.ts';
import { RepositoryInspectionService } from '../../repository-inspection/repository-inspection.service.ts';
import { resolveArtifactForWrite } from '../artifact-type-registry/artifact-type-registry.utils.ts';
import type { RecordSettledRunArtifactsInput } from './settle-run-ledger.types.ts';

/** Seeded service account that owns Ralph runs (databases/openthrottle/migrations/045). */
const WORKFLOW_RALPH_SERVICE_ACCOUNT_NAME = 'workflow-ralph';
const TOOL_NAME = 'workflow-ralph';

/** Runs that may have opened a PR without reporting it: everything that started and then ended. */
const ENDED_RUN_STATUSES = [
  PLAN_RUN_STATUS.CANCELLED,
  PLAN_RUN_STATUS.COMPLETED,
  PLAN_RUN_STATUS.FAILED,
  PLAN_RUN_STATUS.STALE,
];

/** How far back the branch backstop looks. A run older than this has had its chance. */
const BRANCH_LINK_WINDOW_MS = 48 * 60 * 60 * 1000;

/** Runs looked up per sweep, to bound forge API calls. */
const BRANCH_LINK_BATCH_SIZE = 25;

@Injectable()
export class SettleRunLedgerService {
  constructor(
    private readonly logger: LoggerService,
    private readonly planRunsRepository: PlanRunsRepository,
    private readonly repositoriesService: RepositoriesService,
    private readonly repositoryCheckoutsService: RepositoryCheckoutsService,
    private readonly repositoryInspectionService: RepositoryInspectionService,
    private readonly serviceAccountsRepository: ServiceAccountsRepository,
    private readonly sourceControlService: SourceControlService,
    private readonly workArtifactsRepository: WorkArtifactsRepository,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  /**
   * @description Write the run's git_commit and pull_request artifacts plus their subject rows, in
   * one transaction. No-op when the caller supplied neither a sha nor a PR number (a run that failed
   * before opening a PR correctly records nothing). Never throws.
   */
  async recordSettledRunArtifacts(
    input: RecordSettledRunArtifactsInput,
  ): Promise<void> {
    const { headSha, planRun, prNumber } = input;

    if (headSha == null && prNumber == null) return;

    try {
      const repo = await this.resolveRepoRef(planRun);

      if (repo == null) {
        this.logger.warn(
          `Work-ledger: could not resolve a repository for plan run ${planRun.id}; skipping settle-time artifacts.`,
          SettleRunLedgerService.name,
        );
        return;
      }

      const actorServiceAccountId = await this.resolveActorServiceAccountId();

      if (actorServiceAccountId == null) {
        this.logger.warn(
          `Work-ledger: could not resolve a service account; skipping settle-time artifacts for plan run ${planRun.id}.`,
          SettleRunLedgerService.name,
        );
        return;
      }

      await this.writeArtifacts({
        actorServiceAccountId,
        headSha,
        planRun,
        prNumber,
        repo,
        source: WORK_ARTIFACT_SOURCE.AGENT,
      });
    } catch (error) {
      this.logger.warn(
        `Work-ledger: failed to record settle-time artifacts for plan run ${planRun.id}: ${String(error)}`,
        SettleRunLedgerService.name,
      );
    }
  }

  /**
   * @description Backstop for runs that ended without reporting a PR: a run that FAILED, went
   * STALE or was CANCELLED after pushing, or settled COMPLETED without a prNumber. For each recent
   * ended run with a branch and no pull_request artifact, ask the forge for a request on that
   * branch and record it as an `adapter` artifact under the run, so the verifier takes it from
   * there and PlanRun.pullRequest can show it. The forge is the evidence; nothing the run printed
   * is trusted. Returns how many runs were linked. Never throws.
   */
  async linkPullRequestsForUnreportedRuns(): Promise<number> {
    try {
      const runs = await this.findRunsWithoutPullRequest();
      const actorServiceAccountId =
        runs.length === 0 ? null : await this.resolveActorServiceAccountId();

      if (actorServiceAccountId == null) return 0;

      let linked = 0;

      for (const run of runs) {
        // eslint-disable-next-line no-await-in-loop -- sequential to bound forge API pressure
        if (await this.linkPullRequestFromBranch(run, actorServiceAccountId)) {
          linked += 1;
        }
      }

      return linked;
    } catch (error) {
      this.logger.warn(
        `Work-ledger: branch PR backstop failed: ${String(error)}`,
        SettleRunLedgerService.name,
      );
      return 0;
    }
  }

  /** Recent ended runs with a branch whose sessions carry no pull_request artifact. */
  private async findRunsWithoutPullRequest(): Promise<PlanRun[]> {
    return this.planRunsRepository.findEndedRunsWithoutPullRequest({
      limit: BRANCH_LINK_BATCH_SIZE,
      statuses: ENDED_RUN_STATUSES,
      updatedSince: new Date(Date.now() - BRANCH_LINK_WINDOW_MS),
    });
  }

  /** One run: look its branch up on the forge and record the request it finds. */
  private async linkPullRequestFromBranch(
    planRun: PlanRun,
    actorServiceAccountId: string,
  ): Promise<boolean> {
    const branch = nonEmpty(planRun.branch);

    if (branch == null) return false;

    try {
      const repo = await this.resolveRepoRef(planRun);
      const forge =
        repo == null ? null : this.sourceControlService.forge(repo.forge);

      if (repo == null || forge == null) return false;

      const pull = await forge.findPullRequestForBranch(repo.fullName, branch);

      if (pull == null) return false;

      // Someone else already recorded this request (another run on the same branch, a human
      // session): it is on the ledger, and a second session for it would only be noise.
      const { externalKey } = resolveArtifactForWrite('pull_request', {
        ...repoPayloadFields(repo),
        number: pull.number,
      });
      const existing = await this.workArtifactsRepository.findOne({
        where: { externalKey, type: 'pull_request' },
      });

      if (existing != null) return false;

      await this.writeArtifacts({
        actorServiceAccountId,
        headSha: null,
        planRun,
        prNumber: pull.number,
        repo,
        source: WORK_ARTIFACT_SOURCE.ADAPTER,
      });

      return true;
    } catch (error) {
      this.logger.warn(
        `Work-ledger: could not link a PR for plan run ${planRun.id} on branch ${branch}: ${String(error)}`,
        SettleRunLedgerService.name,
      );
      return false;
    }
  }

  /** One transaction: the session, its subjects, and both artifacts land together or not at all. */
  private async writeArtifacts(params: {
    readonly actorServiceAccountId: string;
    readonly headSha: string | null;
    readonly planRun: PlanRun;
    readonly prNumber: number | null;
    readonly repo: ForgeRepoRef;
    readonly source: WorkArtifactSource;
  }): Promise<void> {
    const { actorServiceAccountId, headSha, planRun, prNumber, repo, source } =
      params;
    const taskId = resolveTargetTaskId(planRun);
    const now = new Date();

    await this.dataSource.transaction(async (manager) => {
      const sessionRepo = manager.getRepository(WorkSession);
      const subjectRepo = manager.getRepository(WorkSessionSubject);
      const artifactRepo = manager.getRepository(WorkArtifact);

      const onBehalfOfUserId = planRun.actorUserId ?? null;
      const session = await sessionRepo.save(
        sessionRepo.create({
          actorServiceAccountId,
          actorUserId: null,
          externalRef: planRun.id,
          model: planRun.model ?? null,
          onBehalfOfUserId,
          // Verified: actor_user_id was stamped from an authenticated principal at register time.
          onBehalfOfVerified: onBehalfOfUserId != null,
          planRunId: planRun.id,
          toolName: TOOL_NAME,
        }),
      );

      await subjectRepo.save(
        subjectRepo.create({
          planId: planRun.planId,
          sessionId: session.id,
          taskId,
        }),
      );

      const pending: Array<{
        readonly payload: Record<string, unknown>;
        readonly type: string;
      }> = [];

      if (headSha != null) {
        pending.push({
          payload: { ...repoPayloadFields(repo), sha: headSha },
          type: 'git_commit',
        });
      }

      if (prNumber != null) {
        pending.push({
          payload: { ...repoPayloadFields(repo), number: prNumber },
          type: 'pull_request',
        });
      }

      const resolved = pending.map((entry) => ({
        resolved: resolveArtifactForWrite(entry.type, entry.payload),
        type: entry.type,
      }));

      // The artifact may already exist — the same PR settled twice, or the harvest got there
      // first. uq_work_artifacts_type_external_key is global, so a blind insert would throw.
      const existing = await Promise.all(
        resolved.map(async (entry) =>
          artifactRepo.findOne({
            where: {
              externalKey: entry.resolved.externalKey,
              type: entry.type,
            },
          }),
        ),
      );

      const missing = resolved.filter((_entry, index) => {
        const found = existing[index];
        return found === undefined || found === null;
      });

      if (missing.length === 0) return;

      await artifactRepo.save(
        missing.map((entry) =>
          artifactRepo.create({
            externalKey: entry.resolved.externalKey,
            lifecycle: entry.resolved.initialLifecycle,
            message: null,
            payload: entry.resolved.payload,
            producedAt: now,
            sessionId: session.id,
            source,
            type: entry.type,
          }),
        ),
      );
    });
  }

  /**
   * @description Resolves the run's repository, most specific source first, then names it on its
   * forge (see {@link toRepoRef}):
   *
   * 1. `plan_runs.checkout_id` (or the snapshot's) -> repository_id. The user-JWT path, where the
   *    orchestrator registered the run's worktree checkout.
   * 2. `run_config_snapshot.workspace.repositoryId`.
   * 3. `run_config_snapshot.workspace.workingDirectory` -> its git remote -> a registered
   *    repository. A service-account enqueue (actor_user_id null) can only name a raw path, and no
   *    worktree checkout is registered without a user to own it, so this is the only anchor it has.
   *
   * Every hop is a lookup against registered rows; the repo name is never derived from a remote
   * string directly, so the wrong remote can only ever miss, not mis-record.
   */
  private async resolveRepoRef(planRun: PlanRun): Promise<ForgeRepoRef | null> {
    const workspace = planRun.runConfigSnapshot?.workspace;

    const fromCheckout = await this.resolveRepositoryIdFromCheckout(
      nonEmpty(planRun.checkoutId) ?? nonEmpty(workspace?.checkoutId),
    );
    const repositoryIds = [fromCheckout, nonEmpty(workspace?.repositoryId)];

    for (const repositoryId of repositoryIds) {
      if (repositoryId == null) continue;
      // eslint-disable-next-line no-await-in-loop -- deliberate precedence: stop at the first hit
      const repository = await this.repositoriesService.findById(repositoryId);
      if (repository != null) return this.toRepoRef(repository);
    }

    return this.resolveRepoRefFromPath(nonEmpty(workspace?.workingDirectory));
  }

  /**
   * A registered repository on its forge, or null when its remote is on a forge this server has no
   * adapter for. GitHub keeps `repositories.name` (already `owner/repo`, and what every existing row
   * was keyed on); another forge takes the full path from its remote, because `name` keeps only the
   * last two segments and a GitLab group can nest.
   *
   * Only a repository with no remote at all (a provisional, local-only one) falls back to GitHub,
   * which is what it always meant. A Bitbucket or GitHub Enterprise remote is NOT GitHub: recording
   * it as such would have the verifier ask github.com, 404, and orphan the rows, so it records
   * nothing and says which host it could not serve.
   */
  private toRepoRef(repository: {
    readonly name: string;
    readonly normalizedRemoteUrl: string | null;
  }): ForgeRepoRef | null {
    const remote = nonEmpty(repository.normalizedRemoteUrl);

    if (remote == null) {
      return { forge: DEFAULT_FORGE_KIND, fullName: repository.name };
    }

    const parsed = this.sourceControlService.parseRemote(remote);

    if (parsed == null) {
      this.logger.warn(
        `Work-ledger: repository ${repository.name} is on ${remoteHost(remote)}, which has no forge adapter; recording no artifacts for it.`,
        SettleRunLedgerService.name,
      );
      return null;
    }

    if (parsed.forge !== DEFAULT_FORGE_KIND) return parsed;

    return { forge: DEFAULT_FORGE_KIND, fullName: repository.name };
  }

  private async resolveRepositoryIdFromCheckout(
    checkoutId: string | null,
  ): Promise<string | null> {
    if (checkoutId == null) return null;

    const checkout = await this.repositoryCheckoutsService.findById(checkoutId);

    return checkout?.repositoryId ?? null;
  }

  /** The working directory's normalized git remote, matched against registered repositories. */
  private async resolveRepoRefFromPath(
    workingDirectory: string | null,
  ): Promise<ForgeRepoRef | null> {
    if (workingDirectory == null) return null;

    const inspection =
      await this.repositoryInspectionService.scan(workingDirectory);
    const remote = nonEmpty(inspection.git.normalizedRemoteUrl);

    if (remote == null) return null;

    const repository =
      await this.repositoriesService.findByNormalizedRemoteUrl(remote);

    return repository == null ? null : this.toRepoRef(repository);
  }

  /** The seeded Ralph service account; null when it cannot be resolved. */
  private async resolveActorServiceAccountId(): Promise<string | null> {
    const account = await this.serviceAccountsRepository.findByName(
      WORKFLOW_RALPH_SERVICE_ACCOUNT_NAME,
    );

    return account?.id ?? null;
  }
}

/** The host of a remote URL, for log lines; the raw string when it does not parse. */
function remoteHost(remote: string): string {
  return /^(?:[a-z+]+:\/\/)?(?:[^@/]+@)?([^/:]+)/iu.exec(remote)?.[1] ?? remote;
}

function nonEmpty(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed === undefined || trimmed === '' ? null : trimmed;
}

/**
 * A task-targeted run names its task in the run-config snapshot. Returns null for a plan-level run,
 * and for anything unparseable — a wrong task subject is worse than none.
 */
function resolveTargetTaskId(planRun: PlanRun): string | null {
  const snapshot: unknown = planRun.runConfigSnapshot;

  if (snapshot == null || typeof snapshot !== 'object') return null;
  if (!('target' in snapshot)) return null;

  const target: unknown = snapshot.target;

  if (target == null || typeof target !== 'object') return null;
  if (!('taskId' in target)) return null;

  const taskId: unknown = target.taskId;

  return typeof taskId === 'string' && taskId !== '' ? taskId : null;
}
