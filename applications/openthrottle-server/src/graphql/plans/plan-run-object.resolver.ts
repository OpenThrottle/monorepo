/**
 * @description Field resolvers for {@link PlanRunObject} that join other tables:
 * the run's on-disk `checkout` (plan_runs.checkout_id -> repository_checkouts, the
 * home for editor deep-links) and its linked `pullRequest` (over the work-ledger
 * bridge work_sessions.plan_run_id -> work_artifacts type='pull_request'). Kept in
 * a dedicated resolver so PlansResolver (@Resolver(PlanObject)) stays focused; the
 * scalar provenance fields (branch, model) are plain columns set in mapPlanRunObject.
 */

import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import {
  RepositoryCheckoutsService,
  WorkLedgerService,
} from '@openthrottle/nestjs-repositories';
import { In } from 'typeorm';
import {
  PlanRunCheckoutObject,
  PlanRunObject,
  PlanRunPullRequestObject,
} from './plan.object';

// @authz-stance: authenticated-only (Path A — see OT plan 18e16dfc-4f22-43f9-9b77-6fc90309b60a).
// Field resolvers on a PlanRunObject already fetched by an authenticated parent
// query (planRunsByPlanId); they only surface provenance visible via that run.

/** work_artifacts.type for a pull-request artifact (see artifact-type-registry). */
const PULL_REQUEST_ARTIFACT_TYPE = 'pull_request';

@Resolver(() => PlanRunObject)
export class PlanRunObjectResolver {
  constructor(
    private readonly repositoryCheckoutsService: RepositoryCheckoutsService,
    private readonly workLedgerService: WorkLedgerService,
  ) {}

  /**
   * @description The run's on-disk checkout (kind='worktree' for provisioned
   * runs). Resolves plan_runs.checkout_id -> repository_checkouts so consumers get
   * the durable filesystem_path (for "open in editor") rather than a JSONB read.
   * Null when the run carries no checkout or the checkout was torn down.
   */
  @ResolveField(() => PlanRunCheckoutObject, {
    description:
      "The run's on-disk checkout (worktree/primary) joined from checkout_id; its filesystemPath powers editor deep-links. Null when the run has no resolved checkout.",
    nullable: true,
  })
  async checkout(
    @Parent() run: PlanRunObject,
  ): Promise<PlanRunCheckoutObject | null> {
    if (run.checkoutId == null) {
      return null;
    }
    const checkout = await this.repositoryCheckoutsService.findById(
      run.checkoutId,
    );
    if (!checkout) {
      return null;
    }
    return {
      displayName: checkout.displayName,
      filesystemPath: checkout.filesystemPath,
      kind: checkout.kind,
    };
  }

  /**
   * @description The pull request linked to this run, if any. Follows the
   * work-ledger bridge (work_sessions.plan_run_id -> work_artifacts of
   * type='pull_request') and returns the most recently produced one. Powers
   * branch↔PR surfacing (the branch is on the run; the PR hangs off its session).
   * Null when the run has produced no pull_request artifact yet.
   */
  @ResolveField(() => PlanRunPullRequestObject, {
    description:
      "The run's linked pull request (via the work-ledger session bridge), with lifecycle state and GitHub URL. Null when no PR has been recorded for the run.",
    nullable: true,
  })
  async pullRequest(
    @Parent() run: PlanRunObject,
  ): Promise<PlanRunPullRequestObject | null> {
    const sessions = await this.workLedgerService
      .getSessionRepository()
      .find({ where: { planRunId: run.id } });
    const sessionIds = [...new Set(sessions.map((session) => session.id))];
    if (sessionIds.length === 0) {
      return null;
    }

    const artifact = await this.workLedgerService
      .getArtifactRepository()
      .findOne({
        order: { producedAt: 'DESC' },
        where: { sessionId: In(sessionIds), type: PULL_REQUEST_ARTIFACT_TYPE },
      });
    if (!artifact) {
      return null;
    }

    const repo = String(artifact.payload.repo ?? '');
    const number = Number(artifact.payload.number ?? 0);
    if (repo === '' || !Number.isInteger(number) || number <= 0) {
      return null;
    }

    return {
      number,
      repo,
      state: artifact.lifecycle,
      url: `https://github.com/${repo}/pull/${number}`,
    };
  }
}
