/**
 * @description Field resolvers for {@link PlanRunObject} that join other tables:
 * the run's on-disk `checkout` (plan_runs.checkout_id -> repository_checkouts, the
 * home for editor deep-links) and its linked `pullRequest` (over the work-ledger
 * bridge work_sessions.plan_run_id -> work_artifacts type='pull_request'). Both
 * go through request-scoped {@link PlanRunLoaders}, so a list of runs batches
 * into a fixed number of queries. Kept in
 * a dedicated resolver so PlansResolver (@Resolver(PlanObject)) stays focused; the
 * scalar provenance fields (branch, model) are plain columns set in mapPlanRunObject.
 */

import { Parent, ResolveField, Resolver } from '@nestjs/graphql';

import { SourceControlService } from '../../../services/source-control/source-control.service.ts';
import {
  PlanRunCheckoutObject,
  PlanRunObject,
  PlanRunPullRequestObject,
} from '../plan.object.ts';
import { PlanRunLoaders } from './loaders/loaders.service.ts';
import { toPlanRunPullRequestObject } from './plan-run-object.utils.ts';

// @authz-stance: authenticated-only (Path A — see OT plan 18e16dfc-4f22-43f9-9b77-6fc90309b60a).
// Field resolvers on a PlanRunObject already fetched by an authenticated parent
// query (planRunsByPlanId); they only surface provenance visible via that run.

@Resolver(() => PlanRunObject)
export class PlanRunObjectResolver {
  constructor(
    private readonly loaders: PlanRunLoaders,
    private readonly sourceControlService: SourceControlService,
  ) {}

  /**
   * @description The run's on-disk checkout (kind='worktree' for provisioned
   * runs). Resolves plan_runs.checkout_id -> repository_checkouts so consumers get
   * the durable filesystem_path (for "open in editor") rather than a JSONB read.
   * Null when the run carries no checkout or the checkout was torn down.
   */
  @ResolveField(() => PlanRunCheckoutObject, {
    description: `The run's on-disk checkout (worktree/primary) joined from checkout_id; its filesystemPath powers editor deep-links. Null when the run has no resolved checkout.`,
    nullable: true,
  })
  async checkout(
    @Parent() run: PlanRunObject,
  ): Promise<PlanRunCheckoutObject | null> {
    if (run.checkoutId == null) {
      return null;
    }
    const checkout = await this.loaders.checkoutLoader.load(run.checkoutId);
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
    description: `The run's linked pull request (via the work-ledger session bridge), with lifecycle state and its URL on the forge (GitHub, GitLab). Null when no PR has been recorded for the run.`,
    nullable: true,
  })
  async pullRequest(
    @Parent() run: PlanRunObject,
  ): Promise<PlanRunPullRequestObject | null> {
    const artifact =
      await this.loaders.pullRequestArtifactByPlanRunIdLoader.load(run.id);
    if (!artifact) {
      return null;
    }

    return toPlanRunPullRequestObject(artifact, this.sourceControlService);
  }
}
