import { Processor, WorkerHost } from '@nestjs/bullmq';
import { OnApplicationShutdown, OnModuleInit } from '@nestjs/common';
import { defaultWorkerOptions } from '@openthrottle/nestjs-bullmq';
import { GitHubService } from '@openthrottle/nestjs-github';
import { LoggerService } from '@openthrottle/nestjs-modules';
import {
  WORK_ARTIFACT_VERIFICATION,
  WorkLedgerService,
} from '@openthrottle/nestjs-repositories';
import type { WorkArtifact } from '@openthrottle/nestjs-repositories';
import { Not } from 'typeorm';
import { TaggingEnqueueService } from '../tagging/tagging-enqueue.service';
import {
  WORK_LEDGER_VERIFY_BATCH_SIZE,
  WORK_LEDGER_VERIFY_ORPHAN_GRACE_HOURS,
  WORK_LEDGER_VERIFY_QUEUE_NAME,
} from './work-ledger-verify.constants';
import type {
  WorkLedgerVerifyJob,
  WorkLedgerVerifySummary,
} from './work-ledger-verify.types';

const CONCURRENCY = 1;
const MS_PER_HOUR = 60 * 60 * 1000;
const LANDED = 'landed';

/** Compare statuses that mean `head` is reachable from `base` (i.e. it has landed). */
const REACHABLE_STATUSES = new Set(['behind', 'identical']);

/** Split "owner/repo" into its parts; null if malformed. */
function parseOwnerRepo(repo: unknown): { name: string; owner: string } | null {
  if (typeof repo !== 'string') return null;
  const slash = repo.indexOf('/');
  if (slash <= 0 || slash === repo.length - 1) return null;
  return { name: repo.slice(slash + 1), owner: repo.slice(0, slash) };
}

type VerifyOutcome = 'landed' | 'orphaned' | 'pending' | 'verified';

/**
 * @description Work-ledger verifier (git adapter, poller mode). On a schedule, for each not-yet-landed,
 * not-orphaned git_commit artifact it: confirms the commit exists on GitHub (unverified → verified);
 * detects when it has landed on the default branch — directly, or via squash mapping to the merged
 * PR's merge_commit_sha (recorded as payload.landedSha) — and promotes lifecycle to 'landed'; and
 * orphans a commit GitHub still can't find past the grace window. On a landed transition it re-keys
 * the #182 refine-tagging trigger by enqueueing a refine per subject plan (deterministic jobId →
 * self-healing). Idempotent: re-queries each sweep, so a dropped run recovers next time.
 *
 * NOTE: trailer harvesting (adopting un-claimed trailer commits on main as source='adapter' artifacts)
 * is a separate discovery concern, tracked in the verifier follow-up — not done here.
 */
@Processor(WORK_LEDGER_VERIFY_QUEUE_NAME, {
  ...defaultWorkerOptions,
  concurrency: CONCURRENCY,
})
export class WorkLedgerVerifyProcessor
  extends WorkerHost
  implements OnApplicationShutdown, OnModuleInit
{
  constructor(
    private readonly githubService: GitHubService,
    private readonly logger: LoggerService,
    private readonly taggingEnqueueService: TaggingEnqueueService,
    private readonly workLedgerService: WorkLedgerService,
  ) {
    super();
  }

  onModuleInit(): void {
    this.logger.info(
      `Work-ledger verify worker started (concurrency=${CONCURRENCY})`,
      WorkLedgerVerifyProcessor.name,
    );
  }

  async onApplicationShutdown(signal?: string): Promise<void> {
    this.logger.info(
      `Work-ledger verify worker shutting down (signal=${signal ?? 'unknown'})`,
      WorkLedgerVerifyProcessor.name,
    );
    await this.worker.close();
  }

  async process(job: WorkLedgerVerifyJob): Promise<void> {
    this.logger.info(
      `Work-ledger verify sweep started: jobId=${job.id}`,
      WorkLedgerVerifyProcessor.name,
    );

    const summary = await this.verifyGitCommits();

    this.logger.info(
      `Work-ledger verify sweep done: examined=${summary.examined}, verified=${summary.verified}, landed=${summary.landed}, orphaned=${summary.orphaned}, pending=${summary.pending}`,
      WorkLedgerVerifyProcessor.name,
    );
  }

  private async verifyGitCommits(): Promise<WorkLedgerVerifySummary> {
    const artifacts = await this.workLedgerService
      .getArtifactRepository()
      .find({
        order: { producedAt: 'ASC' },
        take: WORK_LEDGER_VERIFY_BATCH_SIZE,
        where: {
          lifecycle: Not(LANDED),
          type: 'git_commit',
          verification: Not(WORK_ARTIFACT_VERIFICATION.ORPHANED),
        },
      });

    // Default branch is per-repo; resolve once per repo per sweep.
    const defaultBranchByRepo = new Map<string, string | null>();
    const summary: WorkLedgerVerifySummary = {
      examined: artifacts.length,
      landed: 0,
      orphaned: 0,
      pending: 0,
      verified: 0,
    };

    for (const artifact of artifacts) {
      // eslint-disable-next-line no-await-in-loop -- sequential to bound GitHub API pressure
      const outcome = await this.verifyOne(artifact, defaultBranchByRepo);
      if (outcome === 'landed') summary.landed += 1;
      else if (outcome === 'verified') summary.verified += 1;
      else if (outcome === 'orphaned') summary.orphaned += 1;
      else summary.pending += 1;
    }

    return summary;
  }

  private async verifyOne(
    artifact: WorkArtifact,
    defaultBranchByRepo: Map<string, string | null>,
  ): Promise<VerifyOutcome> {
    const ownerRepo = parseOwnerRepo(artifact.payload.repo);
    const sha = artifact.payload.sha;

    if (ownerRepo == null || typeof sha !== 'string') {
      this.logger.warn(
        `Work-ledger verify: malformed git_commit payload on artifact ${artifact.id}; skipping.`,
        WorkLedgerVerifyProcessor.name,
      );
      return 'pending';
    }

    const { name, owner } = ownerRepo;
    const repoKey = `${owner}/${name}`;

    try {
      const commit = await this.githubService.getCommitDetail(owner, name, sha);

      if (commit == null) {
        return this.maybeOrphan(artifact);
      }

      const now = new Date();
      if (artifact.verification !== WORK_ARTIFACT_VERIFICATION.VERIFIED) {
        artifact.verification = WORK_ARTIFACT_VERIFICATION.VERIFIED;
        artifact.verifiedAt = now;
      }

      const landedSha = await this.resolveLandedSha(
        owner,
        name,
        sha,
        repoKey,
        defaultBranchByRepo,
      );

      const repo = this.workLedgerService.getArtifactRepository();

      if (landedSha != null) {
        artifact.lifecycle = LANDED;
        artifact.payload = { ...artifact.payload, landedSha };
        await repo.save(artifact);
        await this.enqueueRefineForSubjects(
          artifact.sessionId,
          repoKey,
          landedSha,
        );
        return 'landed';
      }

      await repo.save(artifact);
      return 'verified';
    } catch (error) {
      this.logger.warn(
        `Work-ledger verify: error checking artifact ${artifact.id}: ${String(error)}`,
        WorkLedgerVerifyProcessor.name,
      );
      return 'pending';
    }
  }

  /** Orphan a commit GitHub can't find once it is older than the grace window; else leave it. */
  private async maybeOrphan(artifact: WorkArtifact): Promise<VerifyOutcome> {
    const ageMs = Date.now() - artifact.producedAt.getTime();
    if (ageMs < WORK_LEDGER_VERIFY_ORPHAN_GRACE_HOURS * MS_PER_HOUR) {
      return 'pending';
    }

    artifact.verification = WORK_ARTIFACT_VERIFICATION.ORPHANED;
    await this.workLedgerService.getArtifactRepository().save(artifact);
    return 'orphaned';
  }

  /**
   * Returns the sha that landed on the default branch: the commit itself if directly reachable,
   * or its squash commit (the merged PR's merge_commit_sha) if that is reachable. null if not landed.
   */
  private async resolveLandedSha(
    owner: string,
    name: string,
    sha: string,
    repoKey: string,
    defaultBranchByRepo: Map<string, string | null>,
  ): Promise<string | null> {
    if (!defaultBranchByRepo.has(repoKey)) {
      defaultBranchByRepo.set(
        repoKey,
        await this.githubService.getDefaultBranch(owner, name),
      );
    }
    const defaultBranch = defaultBranchByRepo.get(repoKey) ?? null;
    if (defaultBranch == null) return null;

    const directStatus = await this.githubService.compareCommitStatus(
      owner,
      name,
      defaultBranch,
      sha,
    );
    if (directStatus != null && REACHABLE_STATUSES.has(directStatus)) {
      return sha;
    }

    // Not directly on the branch — it may have landed via a squash merge under a new sha.
    const mergeSha = await this.githubService.getMergeCommitShaForCommit(
      owner,
      name,
      sha,
    );
    if (mergeSha == null) return null;

    const mergeStatus = await this.githubService.compareCommitStatus(
      owner,
      name,
      defaultBranch,
      mergeSha,
    );
    return mergeStatus != null && REACHABLE_STATUSES.has(mergeStatus)
      ? mergeSha
      : null;
  }

  /** Re-key the #182 refine-tagging trigger: one refine per subject plan of the landed artifact. */
  private async enqueueRefineForSubjects(
    sessionId: string,
    repoKey: string,
    landedSha: string,
  ): Promise<void> {
    const subjects = await this.workLedgerService
      .getSubjectRepository()
      .find({ where: { sessionId } });
    const planIds = [...new Set(subjects.map((subject) => subject.planId))];

    for (const planId of planIds) {
      // eslint-disable-next-line no-await-in-loop -- small set (a session's subject plans)
      await this.taggingEnqueueService.enqueueRefine(
        planId,
        repoKey,
        landedSha,
      );
    }
  }
}
