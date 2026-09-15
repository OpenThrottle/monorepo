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
 * and `name` is already stored as `owner/repo`.
 *
 * Best-effort throughout, like the neighbouring WorkLedgerRunService: ledger bookkeeping must never
 * be the reason a run fails to settle. Every failure is logged and swallowed.
 */

import { Injectable } from '@nestjs/common';
import { LoggerService } from '@openthrottle/nestjs-modules';
import type { PlanRun } from '@openthrottle/nestjs-repositories';
import {
  RepositoriesService,
  RepositoryCheckoutsService,
  ServiceAccountsService,
  WORK_ARTIFACT_SOURCE,
  WorkArtifact,
  WorkLedgerService,
  WorkSession,
  WorkSessionSubject,
} from '@openthrottle/nestjs-repositories';

import { resolveArtifactForWrite } from './artifact-type-registry.ts';

/** Seeded service account that owns Ralph runs (databases/migrations/045). */
const WORKFLOW_RALPH_SERVICE_ACCOUNT_NAME = 'workflow-ralph';
const TOOL_NAME = 'workflow-ralph';

export interface RecordSettledRunArtifactsInput {
  /** Branch head sha at PR-open. Null when the caller did not supply one. */
  readonly headSha: string | null;
  /** The settled run. */
  readonly planRun: PlanRun;
  /** PR number the run opened. Null when the caller did not supply one. */
  readonly prNumber: number | null;
}

@Injectable()
export class SettleRunLedgerService {
  constructor(
    private readonly logger: LoggerService,
    private readonly repositoriesService: RepositoriesService,
    private readonly repositoryCheckoutsService: RepositoryCheckoutsService,
    private readonly serviceAccountsService: ServiceAccountsService,
    private readonly workLedgerService: WorkLedgerService,
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
      const repo = await this.resolveRepoName(planRun);

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
      });
    } catch (error) {
      this.logger.warn(
        `Work-ledger: failed to record settle-time artifacts for plan run ${planRun.id}: ${String(error)}`,
        SettleRunLedgerService.name,
      );
    }
  }

  /** One transaction: the session, its subjects, and both artifacts land together or not at all. */
  private async writeArtifacts(params: {
    readonly actorServiceAccountId: string;
    readonly headSha: string | null;
    readonly planRun: PlanRun;
    readonly prNumber: number | null;
    readonly repo: string;
  }): Promise<void> {
    const { actorServiceAccountId, headSha, planRun, prNumber, repo } = params;
    const taskId = resolveTargetTaskId(planRun);
    const now = new Date();

    await this.workLedgerService
      .getArtifactRepository()
      .manager.transaction(async (manager) => {
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
          pending.push({ payload: { repo, sha: headSha }, type: 'git_commit' });
        }

        if (prNumber != null) {
          pending.push({
            payload: { number: prNumber, repo },
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
              source: WORK_ARTIFACT_SOURCE.AGENT,
              type: entry.type,
            }),
          ),
        );
      });
  }

  /** checkout_id -> repository_id -> repositories.name, which is already stored as `owner/repo`. */
  private async resolveRepoName(planRun: PlanRun): Promise<string | null> {
    if (planRun.checkoutId == null) return null;

    const checkout = await this.repositoryCheckoutsService.findById(
      planRun.checkoutId,
    );

    if (checkout == null) return null;

    const repository = await this.repositoriesService.findById(
      checkout.repositoryId,
    );

    return repository?.name ?? null;
  }

  /** The seeded Ralph service account; null when it cannot be resolved. */
  private async resolveActorServiceAccountId(): Promise<string | null> {
    const account = await this.serviceAccountsService.findByName(
      WORKFLOW_RALPH_SERVICE_ACCOUNT_NAME,
    );

    return account?.id ?? null;
  }
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
