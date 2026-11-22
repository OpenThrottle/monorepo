/**
 * @description The project-run fields on Project: `latestProjectRun` (its newest run, any status)
 * and `activeProjectRun` (that run while it is QUEUED or IN_PROGRESS). One loader backs both: a
 * project has at most one active run, and it is always its newest.
 */

import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { PROJECT_RUN_ACTIVE_STATUSES } from '@openthrottle/nestjs-repositories-server';

import { ProjectObject } from '../project.object.ts';
import { ProjectRunObject } from '../project-run.object.ts';
import { ProjectRunLoaders } from '../project-run/loaders/loaders.service.ts';
import { toProjectRunObject } from '../project-run/project-run.utils.ts';

// @authz-stance: authenticated-only (Path A — see OT plan 18e16dfc-4f22-43f9-9b77-6fc90309b60a).
@Resolver(() => ProjectObject)
export class ProjectLatestRunResolver {
  constructor(private readonly loaders: ProjectRunLoaders) {}

  @ResolveField(() => ProjectRunObject, {
    description: `The project's newest run, whatever its status; null when it has never run. Resolved through a batched loader.`,
    nullable: true,
  })
  async latestProjectRun(
    @Parent() project: ProjectObject,
  ): Promise<ProjectRunObject | null> {
    const run = await this.loaders.latestRunByProjectIdLoader.load(project.id);

    return run === null ? null : toProjectRunObject(run);
  }

  @ResolveField(() => ProjectRunObject, {
    description: `The project's active (QUEUED or IN_PROGRESS) run; null when none is. Resolved through the same batched loader as latestProjectRun.`,
    nullable: true,
  })
  async activeProjectRun(
    @Parent() project: ProjectObject,
  ): Promise<ProjectRunObject | null> {
    const run = await this.loaders.latestRunByProjectIdLoader.load(project.id);
    const isActive = PROJECT_RUN_ACTIVE_STATUSES.some((status) => {
      return status === run?.status;
    });

    return run !== null && isActive ? toProjectRunObject(run) : null;
  }
}
