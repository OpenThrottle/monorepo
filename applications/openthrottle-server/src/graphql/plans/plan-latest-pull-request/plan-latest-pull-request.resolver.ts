/**
 * @description The `Plan.latestPullRequest` field: the newest pull request any run of the plan
 * recorded on the work ledger. Kept apart from PlansResolver so that resolver stays focused, and
 * resolved through a request-scoped loader so a list of plans batches.
 */

import { Parent, ResolveField, Resolver } from '@nestjs/graphql';

import { SourceControlService } from '../../../services/source-control/source-control.service.ts';
import { PlanObject, PlanRunPullRequestObject } from '../plan.object.ts';
import { toPlanRunPullRequestObject } from '../plan-run-object/plan-run-object.utils.ts';
import { PlanLatestPullRequestLoaders } from './loaders/loaders.service.ts';

// @authz-stance: authenticated-only (Path A — see OT plan 18e16dfc-4f22-43f9-9b77-6fc90309b60a).
// A field on a PlanObject already fetched by an authenticated parent query; it only surfaces the
// PR the plan's own runs recorded.

@Resolver(() => PlanObject)
export class PlanLatestPullRequestResolver {
  constructor(
    private readonly loaders: PlanLatestPullRequestLoaders,
    private readonly sourceControlService: SourceControlService,
  ) {}

  @ResolveField(() => PlanRunPullRequestObject, {
    description: `The newest pull request any run of this plan recorded on the work ledger (number, repo, lifecycle state, forge URL). Null when no run has recorded one. Resolved through a batched loader.`,
    nullable: true,
  })
  async latestPullRequest(
    @Parent() plan: PlanObject,
  ): Promise<PlanRunPullRequestObject | null> {
    const artifact = await this.loaders.pullRequestArtifactByPlanIdLoader.load(
      plan.id,
    );

    if (!artifact) {
      return null;
    }

    return toPlanRunPullRequestObject(artifact, this.sourceControlService);
  }
}
