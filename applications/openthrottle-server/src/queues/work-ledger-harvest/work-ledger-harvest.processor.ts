import { Processor, WorkerHost } from '@nestjs/bullmq';
import { OnApplicationShutdown, OnModuleInit } from '@nestjs/common';
import { defaultWorkerOptions } from '@openthrottle/nestjs-bullmq';
import type { CommitSummaryDto } from '@openthrottle/nestjs-github';
import { GitHubService } from '@openthrottle/nestjs-github';
import { LoggerService } from '@openthrottle/nestjs-modules';
import type { Repository as RepositoryEntity } from '@openthrottle/nestjs-repositories';
import {
  PlansService,
  RepositoriesService,
  ServiceAccountsService,
  UsersService,
  WORK_ARTIFACT_SOURCE,
  WORK_ARTIFACT_VERIFICATION,
  WorkArtifact,
  WorkLedgerService,
  WorkSession,
  WorkSessionSubject,
} from '@openthrottle/nestjs-repositories';

import { resolveArtifactForWrite } from '../../graphql/work-ledger/artifact-type-registry.ts';
import { parsePlanTrailers, planRefMatches } from './parse-plan-trailers.ts';
import {
  WORK_LEDGER_HARVEST_BATCH_SIZE,
  WORK_LEDGER_HARVEST_QUEUE_NAME,
} from './work-ledger-harvest.constants.ts';
import type {
  WorkLedgerHarvestJob,
  WorkLedgerHarvestSummary,
} from './work-ledger-harvest.types.ts';

const CONCURRENCY = 1;
const TOOL_NAME = 'work-ledger-harvest';

/** Seeded service account that owns harvested artifacts (databases/migrations/117). */
const HARVEST_SERVICE_ACCOUNT_NAME = 'work-ledger-harvest';

/** Extract owner/repo from a github.com remote URL; null when it is not one. */
function parseGithubRemote(
  url: string | null,
): { name: string; owner: string } | null {
  if (url == null) return null;

  const match = /github\.com[/:]([^/]+)\/([^/]+?)(?:\.git)?\/?$/i.exec(url);

  if (match == null) return null;

  const owner = match[1];
  const name = match[2];

  return owner != null && name != null ? { name, owner } : null;
}

/**
 * @description Work-ledger trailer harvest. On an hourly sweep, for each eligible repository it
 * reads commits on the default branch newer than the stored watermark, parses their `Plan-Id:` /
 * `Task-Id:` trailers, and adopts each trailer commit as a git_commit artifact with the referenced
 * plans and tasks attached as subjects.
 *
 * WHY THIS EXISTS. The settle-time path records a run's own work while the run is still alive. It
 * cannot cover a plan whose work landed before any of this existed, and it cannot cover a human who
 * opened a PR outside the loop. Those plans have no session left to record anything, so the commit
 * message is the only surviving evidence — and it is durable evidence, which is the point.
 *
 * WHY THE GITHUB API AND NOT A LOCAL CHECKOUT. The server does shell out to git elsewhere, and a
 * local harvest would be cheaper. But a checkout whose main is behind produces false negatives that
 * are indistinguishable from "nothing owed" — the exact silent failure this replaces — and a
 * deployed instance has no checkout at all.
 *
 * Harvested commits are already on the default branch, so they are born landed and verified. That
 * is only safe because `adapter` is on the trigger-suppression list: otherwise a first sweep
 * adopting hundreds of old commits would fire one refine-tagging LLM call per subject plan.
 */
@Processor(WORK_LEDGER_HARVEST_QUEUE_NAME, {
  ...defaultWorkerOptions,
  concurrency: CONCURRENCY,
})
export class WorkLedgerHarvestProcessor
  extends WorkerHost
  implements OnApplicationShutdown, OnModuleInit
{
  constructor(
    private readonly githubService: GitHubService,
    private readonly logger: LoggerService,
    private readonly plansService: PlansService,
    private readonly repositoriesService: RepositoriesService,
    private readonly serviceAccountsService: ServiceAccountsService,
    private readonly usersService: UsersService,
    private readonly workLedgerService: WorkLedgerService,
  ) {
    super();
  }

  onModuleInit(): void {
    this.logger.info(
      `Work-ledger harvest worker started (concurrency=${CONCURRENCY})`,
      WorkLedgerHarvestProcessor.name,
    );
  }

  async onApplicationShutdown(signal?: string): Promise<void> {
    this.logger.info(
      `Work-ledger harvest worker shutting down (signal=${signal ?? 'unknown'})`,
      WorkLedgerHarvestProcessor.name,
    );
    await this.worker.close();
  }

  async process(job: WorkLedgerHarvestJob): Promise<void> {
    this.logger.info(
      `Work-ledger harvest sweep started: jobId=${job.id}`,
      WorkLedgerHarvestProcessor.name,
    );

    const summary: WorkLedgerHarvestSummary = {
      alreadyRecorded: 0,
      examined: 0,
      harvested: 0,
      skipped: 0,
      unresolved: 0,
    };

    const actorServiceAccountId = await this.resolveActorServiceAccountId();

    if (actorServiceAccountId == null) {
      this.logger.warn(
        `Work-ledger harvest: '${HARVEST_SERVICE_ACCOUNT_NAME}' service account is missing; nothing harvested.`,
        WorkLedgerHarvestProcessor.name,
      );
      return;
    }

    const repositories = await this.repositoriesService
      .getRepository()
      .find({ where: { ledgerHarvestEnabled: true } });

    for (const repository of repositories) {
      // eslint-disable-next-line no-await-in-loop -- sequential to bound GitHub API pressure
      await this.harvestRepository(repository, actorServiceAccountId, summary);
    }

    this.logger.info(
      `Work-ledger harvest sweep done: examined=${summary.examined}, harvested=${summary.harvested}, skipped=${summary.skipped}, already-recorded=${summary.alreadyRecorded}, unresolved=${summary.unresolved}`,
      WorkLedgerHarvestProcessor.name,
    );
  }

  private async harvestRepository(
    repository: RepositoryEntity,
    actorServiceAccountId: string,
    summary: WorkLedgerHarvestSummary,
  ): Promise<void> {
    const remote = parseGithubRemote(repository.normalizedRemoteUrl);
    const branch = repository.defaultBranch;

    // Eligibility is derived, not stored: no parseable GitHub remote or no default branch
    // means there is nothing to read, and a second stored flag could only go stale.
    if (remote == null || branch == null || branch === '') return;

    summary.examined += 1;

    const repoKey = `${remote.owner}/${remote.name}`;

    try {
      const commits = await this.githubService.listCommits(
        remote.owner,
        remote.name,
        branch,
        repository.ledgerHarvestCursor,
      );

      const batch = commits.slice(0, WORK_LEDGER_HARVEST_BATCH_SIZE);

      for (const commit of batch) {
        // eslint-disable-next-line no-await-in-loop -- one transaction per commit, by design
        await this.harvestCommit(
          commit,
          repoKey,
          actorServiceAccountId,
          summary,
        );
      }

      // Only advance the watermark over commits actually examined. When the batch cap truncated
      // the page, the cursor stops at the oldest commit handled so the next sweep resumes there
      // rather than skipping the remainder forever.
      const newest = batch[0];

      if (newest !== undefined && batch.length === commits.length) {
        await this.repositoriesService.getRepository().update(
          { id: repository.id },
          {
            ledgerHarvestCursor: newest.sha,
            ledgerHarvestedAt: new Date(),
          },
        );
      }
    } catch (error) {
      this.logger.warn(
        `Work-ledger harvest: error harvesting ${repoKey}: ${String(error)}`,
        WorkLedgerHarvestProcessor.name,
      );
    }
  }

  /** Adopt one trailer commit: a session of its own, its subject plans/tasks, and the artifact. */
  private async harvestCommit(
    commit: CommitSummaryDto,
    repoKey: string,
    actorServiceAccountId: string,
    summary: WorkLedgerHarvestSummary,
  ): Promise<void> {
    const refs = parsePlanTrailers(commit.message);

    if (refs.length === 0) {
      summary.skipped += 1;
      return;
    }

    const resolved = await this.resolvePlanRefs(refs);

    if (resolved.length === 0) {
      summary.unresolved += 1;
      return;
    }

    const artifactRepo = this.workLedgerService.getArtifactRepository();
    const { externalKey, initialLifecycle, payload } = resolveArtifactForWrite(
      'git_commit',
      { repo: repoKey, sha: commit.sha },
    );
    void initialLifecycle;

    const existing = await artifactRepo.findOne({
      where: { externalKey, type: 'git_commit' },
    });

    if (existing != null) {
      summary.alreadyRecorded += 1;
      return;
    }

    const onBehalfOfUserId = await this.resolveOnBehalfOfUserId(
      commit.authorLogin,
    );

    await artifactRepo.manager.transaction(async (manager) => {
      const session = await manager.getRepository(WorkSession).save(
        manager.getRepository(WorkSession).create({
          actorServiceAccountId,
          actorUserId: null,
          externalRef: `${repoKey}@${commit.sha}`,
          onBehalfOfUserId,
          // GitHub's author login is a fact, not a hint — it is the standard the column asks for.
          onBehalfOfVerified: onBehalfOfUserId != null,
          toolName: TOOL_NAME,
        }),
      );

      const subjectRepo = manager.getRepository(WorkSessionSubject);

      await subjectRepo.save(
        resolved.map((subject) =>
          subjectRepo.create({
            planId: subject.planId,
            sessionId: session.id,
            taskId: subject.taskId,
          }),
        ),
      );

      const now = new Date();

      await manager.getRepository(WorkArtifact).save(
        manager.getRepository(WorkArtifact).create({
          externalKey,
          // Already on the default branch: this is not a claim awaiting verification.
          // Safe to be born landed only because 'adapter' suppresses landed triggers.
          lifecycle: 'landed',
          message: firstLine(commit.message),
          payload: { ...payload, landedSha: commit.sha },
          producedAt: now,
          sessionId: session.id,
          source: WORK_ARTIFACT_SOURCE.ADAPTER,
          type: 'git_commit',
          verification: WORK_ARTIFACT_VERIFICATION.VERIFIED,
          verifiedAt: now,
        }),
      );
    });

    summary.harvested += 1;
  }

  /**
   * Resolve trailer refs to real plan ids. Prefix matching is required: some trailers in history
   * are 8-character short ids, and equality alone would drop them as unresolvable.
   */
  private async resolvePlanRefs(
    refs: readonly { planRef: string; taskRef: string | null }[],
  ): Promise<Array<{ planId: string; taskId: string | null }>> {
    const matches = await Promise.all(
      refs.map(async (ref) => {
        const plan = await this.findPlanByRef(ref.planRef);

        return plan == null
          ? null
          : { planId: plan, taskId: ref.taskRef ?? null };
      }),
    );

    return matches.filter(
      (match): match is { planId: string; taskId: string | null } =>
        match !== null,
    );
  }

  private async findPlanByRef(planRef: string): Promise<string | null> {
    // One prefix query covers both shapes: a full uuid matches only itself, and a short-id
    // trailer matches the plan it abbreviates. Two rows are fetched so an ambiguous prefix can
    // be dropped rather than guessed.
    const candidates = await this.plansService
      .getRepository()
      .createQueryBuilder('plan')
      .where('plan.id::text LIKE :prefix', { prefix: `${planRef}%` })
      .limit(2)
      .getMany();

    if (candidates.length !== 1) return null;

    const only = candidates[0];

    return only !== undefined && planRefMatches(planRef, only.id)
      ? only.id
      : null;
  }

  /** Match GitHub's author login to a user. Null when unmatched — never guessed from an email. */
  private async resolveOnBehalfOfUserId(
    authorLogin: string | null,
  ): Promise<string | null> {
    if (authorLogin == null) return null;

    const user = await this.usersService
      .findByGithubUsername(authorLogin)
      .catch(() => null);

    return user?.id ?? null;
  }

  private async resolveActorServiceAccountId(): Promise<string | null> {
    const account = await this.serviceAccountsService.findByName(
      HARVEST_SERVICE_ACCOUNT_NAME,
    );

    return account?.id ?? null;
  }
}

/** Commit subject line, for the artifact's human-readable message. */
function firstLine(message: string): string {
  return message.split('\n')[0]?.trim() ?? '';
}
