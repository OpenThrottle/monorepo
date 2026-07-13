import { Processor, WorkerHost } from '@nestjs/bullmq';
import { OnApplicationShutdown, OnModuleInit } from '@nestjs/common';
import { defaultWorkerOptions } from '@openthrottle/nestjs-bullmq';
import { GitHubService } from '@openthrottle/nestjs-github';
import { LoggerService } from '@openthrottle/nestjs-modules';
import {
  WORK_ARTIFACT_VERIFICATION,
  WorkLedgerService,
} from '@openthrottle/nestjs-repositories';
import {
  WORK_LEDGER_VERIFY_BATCH_SIZE,
  WORK_LEDGER_VERIFY_QUEUE_NAME,
} from './work-ledger-verify.constants';
import type {
  WorkLedgerVerifyJob,
  WorkLedgerVerifySummary,
} from './work-ledger-verify.types';

const CONCURRENCY = 1;

/** Split "owner/repo" into its parts; null if malformed. */
function parseOwnerRepo(repo: unknown): { name: string; owner: string } | null {
  if (typeof repo !== 'string') return null;
  const slash = repo.indexOf('/');
  if (slash <= 0 || slash === repo.length - 1) return null;
  return { name: repo.slice(slash + 1), owner: repo.slice(0, slash) };
}

/**
 * @description Work-ledger verifier (git adapter, poller mode). On a schedule, confirms that
 * unverified `git_commit` artifacts point at commits that actually exist on GitHub, promoting
 * them unverified → verified. Idempotent: re-queries the unverified feed each run, so a dropped
 * run self-heals on the next sweep.
 *
 * SCOPE (slice 6 core): existence verification only. Landed detection (reachable-on-default-branch),
 * squash mapping (branch sha → PR merge_commit_sha), orphan detection (grace window), the
 * git_commit→landed refine-tagging re-key, and trailer harvesting are deferred to the verifier
 * follow-up task — they need new GitHubService methods and real GitHub-API integration testing,
 * and squash mapping is a prerequisite for correct landed/orphan behavior on squash-merged commits.
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

    const summary = await this.verifyGitCommitExistence();

    this.logger.info(
      `Work-ledger verify sweep done: examined=${summary.examined}, verified=${summary.verified}, pending=${summary.pending}`,
      WorkLedgerVerifyProcessor.name,
    );
  }

  /**
   * @description Promotes unverified git_commit artifacts to verified when the commit exists on
   * GitHub. A commit not found (404) stays unverified for a later sweep (it may be unpushed, or a
   * branch sha awaiting squash mapping — orphaning is deliberately deferred, not done on 404 here).
   * A transient transport error on one artifact is logged and skipped so the sweep continues.
   */
  private async verifyGitCommitExistence(): Promise<WorkLedgerVerifySummary> {
    const repo = this.workLedgerService.getArtifactRepository();
    const artifacts = await repo.find({
      order: { producedAt: 'ASC' },
      take: WORK_LEDGER_VERIFY_BATCH_SIZE,
      where: {
        type: 'git_commit',
        verification: WORK_ARTIFACT_VERIFICATION.UNVERIFIED,
      },
    });

    let verified = 0;
    let pending = 0;

    for (const artifact of artifacts) {
      const ownerRepo = parseOwnerRepo(artifact.payload.repo);
      const sha = artifact.payload.sha;

      if (ownerRepo == null || typeof sha !== 'string') {
        pending += 1;
        this.logger.warn(
          `Work-ledger verify: malformed git_commit payload on artifact ${artifact.id}; skipping.`,
          WorkLedgerVerifyProcessor.name,
        );
        continue;
      }

      try {
        // Sequential on purpose: bound GitHub API pressure (rate limits) — one commit at a time.
        // eslint-disable-next-line no-await-in-loop
        const commit = await this.githubService.getCommitDetail(
          ownerRepo.owner,
          ownerRepo.name,
          sha,
        );

        if (commit == null) {
          pending += 1;
          continue;
        }

        artifact.verification = WORK_ARTIFACT_VERIFICATION.VERIFIED;
        artifact.verifiedAt = new Date();
        // eslint-disable-next-line no-await-in-loop
        await repo.save(artifact);
        verified += 1;
      } catch (error) {
        pending += 1;
        this.logger.warn(
          `Work-ledger verify: error checking artifact ${artifact.id}: ${String(error)}`,
          WorkLedgerVerifyProcessor.name,
        );
      }
    }

    return { examined: artifacts.length, pending, verified };
  }
}
