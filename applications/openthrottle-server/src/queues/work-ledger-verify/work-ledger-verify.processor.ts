import { Processor, WorkerHost } from '@nestjs/bullmq';
import { OnApplicationShutdown, OnModuleInit } from '@nestjs/common';
import { defaultWorkerOptions } from '@openthrottle/nestjs-bullmq';
import { GitHubService } from '@openthrottle/nestjs-github';
import { LoggerService } from '@openthrottle/nestjs-modules';
import type { WorkArtifact } from '@openthrottle/nestjs-repositories';
import {
  WORK_ARTIFACT_VERIFICATION,
  WorkLedgerService,
} from '@openthrottle/nestjs-repositories';
import { In, Not } from 'typeorm';

import { shouldFireLifecycleTriggers } from '../../graphql/work-ledger/artifact-type-registry.ts';
import { TaggingEnqueueService } from '../tagging/tagging-enqueue.service.ts';
import {
  WORK_LEDGER_VERIFY_BATCH_SIZE,
  WORK_LEDGER_VERIFY_ORPHAN_GRACE_HOURS,
  WORK_LEDGER_VERIFY_QUEUE_NAME,
} from './work-ledger-verify.constants.ts';
import type {
  WorkLedgerVerifyJob,
  WorkLedgerVerifySummary,
} from './work-ledger-verify.types.ts';

const CONCURRENCY = 1;
const MS_PER_HOUR = 60 * 60 * 1000;
const LANDED = 'landed';
const MERGED = 'merged';
const CLOSED = 'closed';

/** Lifecycle states a pull_request never leaves — nothing more to ask GitHub about. */
const TERMINAL_PULL_REQUEST_STATES = [CLOSED, MERGED];

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
 * self-healing) — but only when the artifact's source says this is live agent-reported work; bulk
 * and adapter-sourced rows land silently (see shouldFireLifecycleTriggers). Idempotent: re-queries
 * each sweep, so a dropped run recovers next time.
 *
 * It also sweeps pull_request artifacts, advancing open -> merged (recording the merge_commit_sha)
 * or open -> closed. A merged PR names the commit that actually landed, which is how an ORPHANED
 * sibling git_commit gets repaired: a branch sha recorded at PR-open and then rebased away is
 * unfindable on its own, but the PR still knows what it became.
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
    await this.verifyPullRequests(summary);

    this.logger.info(
      `Work-ledger verify sweep done: examined=${summary.examined}, verified=${summary.verified}, landed=${summary.landed}, orphaned=${summary.orphaned}, pending=${summary.pending}, pullRequestsExamined=${summary.pullRequestsExamined}, merged=${summary.merged}, closed=${summary.closed}, repaired=${summary.repaired}`,
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
      closed: 0,
      examined: artifacts.length,
      landed: 0,
      merged: 0,
      orphaned: 0,
      pending: 0,
      pullRequestsExamined: 0,
      repaired: 0,
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

        if (
          shouldFireLifecycleTriggers({
            fireTriggers: undefined,
            lifecycle: LANDED,
            source: artifact.source,
            type: artifact.type,
          })
        ) {
          await this.enqueueRefineForSubjects(
            artifact.sessionId,
            repoKey,
            landedSha,
          );
        }

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

  /**
   * Sweep pull_request artifacts that have not reached a terminal lifecycle state. These were
   * registered in the type registry but nothing ever verified them, so every one written sat at
   * lifecycle='open', unverified, forever.
   */
  private async verifyPullRequests(
    summary: WorkLedgerVerifySummary,
  ): Promise<void> {
    const artifacts = await this.workLedgerService
      .getArtifactRepository()
      .find({
        order: { producedAt: 'ASC' },
        take: WORK_LEDGER_VERIFY_BATCH_SIZE,
        where: {
          lifecycle: Not(In(TERMINAL_PULL_REQUEST_STATES)),
          type: 'pull_request',
          verification: Not(WORK_ARTIFACT_VERIFICATION.ORPHANED),
        },
      });

    summary.pullRequestsExamined = artifacts.length;

    for (const artifact of artifacts) {
      // eslint-disable-next-line no-await-in-loop -- sequential to bound GitHub API pressure
      await this.verifyOnePullRequest(artifact, summary);
    }
  }

  private async verifyOnePullRequest(
    artifact: WorkArtifact,
    summary: WorkLedgerVerifySummary,
  ): Promise<void> {
    const ownerRepo = parseOwnerRepo(artifact.payload.repo);
    const number = artifact.payload.number;

    if (ownerRepo == null || typeof number !== 'number') {
      this.logger.warn(
        `Work-ledger verify: malformed pull_request payload on artifact ${artifact.id}; skipping.`,
        WorkLedgerVerifyProcessor.name,
      );
      return;
    }

    const { name, owner } = ownerRepo;

    try {
      const pull = await this.githubService.getPullDetail(owner, name, number);
      const repo = this.workLedgerService.getArtifactRepository();

      artifact.verification = WORK_ARTIFACT_VERIFICATION.VERIFIED;
      artifact.verifiedAt = new Date();

      if (pull.mergedAt != null) {
        artifact.lifecycle = MERGED;

        if (pull.mergeCommitSha != null) {
          artifact.payload = {
            ...artifact.payload,
            mergeCommitSha: pull.mergeCommitSha,
          };
        }

        await repo.save(artifact);
        summary.merged += 1;

        if (pull.mergeCommitSha != null) {
          summary.repaired += await this.repairSiblingCommits(
            artifact.sessionId,
            `${owner}/${name}`,
            pull.mergeCommitSha,
          );
        }

        return;
      }

      if (pull.state === CLOSED) {
        artifact.lifecycle = CLOSED;
        await repo.save(artifact);
        summary.closed += 1;
        return;
      }

      // Still open: confirmed to exist, but not yet an outcome.
      await repo.save(artifact);
    } catch (error) {
      this.logger.warn(
        `Work-ledger verify: error checking pull_request artifact ${artifact.id}: ${String(error)}`,
        WorkLedgerVerifyProcessor.name,
      );
    }
  }

  /**
   * A merged PR names the commit that actually landed. Use it to finish any git_commit on the same
   * session that has not landed — including an ORPHANED one, which is the case worth having: a
   * branch sha recorded at PR-open and then rebased away before the merge can never be found on its
   * own, and would otherwise sit orphaned forever. The PR is the rebase-proof anchor.
   *
   * Returns how many rows were repaired.
   */
  private async repairSiblingCommits(
    sessionId: string,
    repoKey: string,
    mergeCommitSha: string,
  ): Promise<number> {
    const repo = this.workLedgerService.getArtifactRepository();
    const siblings = await repo.find({
      where: { lifecycle: Not(LANDED), sessionId, type: 'git_commit' },
    });

    if (siblings.length === 0) return 0;

    for (const sibling of siblings) {
      sibling.lifecycle = LANDED;
      sibling.payload = { ...sibling.payload, landedSha: mergeCommitSha };
      sibling.verification = WORK_ARTIFACT_VERIFICATION.VERIFIED;
      sibling.verifiedAt = new Date();
    }

    await repo.save(siblings);

    const firing = siblings.filter((sibling) =>
      shouldFireLifecycleTriggers({
        fireTriggers: undefined,
        lifecycle: LANDED,
        source: sibling.source,
        type: sibling.type,
      }),
    );

    for (const _sibling of firing) {
      // eslint-disable-next-line no-await-in-loop -- small set (a session's own commits)
      await this.enqueueRefineForSubjects(sessionId, repoKey, mergeCommitSha);
    }

    return siblings.length;
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
