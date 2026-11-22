/**
 * @description Resolver for Project queries and mutations. Injects ProjectsRepository from @openthrottle/nestjs-repositories-server and ProjectsLoaders. ResolveField for plans and tasks use ProjectsLoaders to avoid N+1.
 */

import { NotFoundException } from '@nestjs/common';
import {
  Args,
  ID,
  Mutation,
  Parent,
  Query,
  ResolveField,
  Resolver,
} from '@nestjs/graphql';
import { assertPagination } from '@openthrottle/nestjs-graphql';
import {
  hasNextPage,
  PAGINATION_DEFAULT_LIMIT,
  PAGINATION_MAX_LIMIT,
} from '@openthrottle/nestjs-postgres';
import type {
  Plan,
  Project,
  ProjectRepository,
  Repository,
  Task,
} from '@openthrottle/nestjs-repositories-server';
import {
  ProjectRepositoriesRepository,
  ProjectsRepository,
  RepositoriesRepository,
} from '@openthrottle/nestjs-repositories-server';

import { PlanProjectMembershipService } from '../../services/plan-project-membership/plan-project-membership.service.ts';
import { PlanObject } from '../plans/plan.object.ts';
import { TaskObject } from '../tasks/task.object.ts';
import { RepositoryObject } from '../workspace-settings/repository.object.ts';
import { ProjectsLoaders } from './loaders/loaders.service.ts';
import {
  AddPlanToProjectInput,
  CreateProjectInput,
  DeleteProjectInput,
  LinkProjectRepositoryInput,
  MoveProjectPlanInput,
  ProjectPlansPageInput,
  RemovePlanFromProjectInput,
  ReorderProjectPlansInput,
  UnlinkProjectRepositoryInput,
  UpdateProjectInput,
} from './project.input.ts';
import { ProjectObject } from './project.object.ts';
import { ProjectPlansPageResultObject } from './project-plans-page.object.ts';
import { ProjectRepositoryObject } from './project-repository.object.ts';

// @authz-stance: authenticated-only (Path A — see OT plan 18e16dfc-4f22-43f9-9b77-6fc90309b60a)
@Resolver(() => ProjectObject)
export class ProjectsResolver {
  constructor(
    private readonly planProjectMembership: PlanProjectMembershipService,
    private readonly projectRelationLoaders: ProjectsLoaders,
    private readonly projectRepositoriesRepository: ProjectRepositoriesRepository,
    private readonly projectsRepository: ProjectsRepository,
    private readonly repositoriesRepository: RepositoriesRepository,
  ) {}

  // @ProfileResponseTime('ProjectsResolver.repositories')
  @ResolveField(() => [RepositoryObject], {
    description: `Repositories linked to this project; ordered by link time ascending`,
  })
  async repositories(@Parent() parent: Project): Promise<Repository[]> {
    return this.projectRelationLoaders.repositoriesByProjectIdLoader.load(
      parent.id,
    );
  }

  // @ProfileResponseTime('ProjectsResolver.plans')
  @ResolveField(() => [PlanObject], {
    description: `Plans linked to this project; ordered by createdAt descending`,
    nullable: true,
  })
  async plans(@Parent() parent: Project): Promise<Plan[]> {
    return this.projectRelationLoaders.plansByProjectIdLoader.load(parent.id);
  }

  // @ProfileResponseTime('ProjectsResolver.tasks')
  @ResolveField(() => [TaskObject], {
    description: `Tasks linked to this project; ordered by createdAt ascending`,
    nullable: true,
  })
  async tasks(@Parent() parent: Project): Promise<Task[]> {
    return this.projectRelationLoaders.tasksByProjectIdLoader.load(parent.id);
  }

  // @ProfileResponseTime('ProjectsResolver.project')
  @Query(() => ProjectObject, {
    description: `Get a project by ID`,
    nullable: true,
  })
  async project(
    @Args('id', { type: () => ID }) id: string,
  ): Promise<Project | null> {
    const entity = await this.projectsRepository.findOne({ where: { id } });

    return entity;
  }

  // @ProfileResponseTime('ProjectsResolver.projects')
  @Query(() => [ProjectObject], {
    description: `List all projects, ordered by createdAt descending`,
  })
  async projects(): Promise<Project[]> {
    const entities = await this.projectsRepository.findAll({ limit: 100 });

    return entities;
  }

  // @ProfileResponseTime('ProjectsResolver.createProject')
  @Mutation(() => ProjectObject, {
    description: `Create a project`,
  })
  async createProject(
    @Args('input', { type: () => CreateProjectInput })
    input: CreateProjectInput,
  ): Promise<Project> {
    const entity = await this.projectsRepository.create({
      description: input.description ?? null,
      name: input.name,
      nxProjectName: input.nxProjectName ?? null,
    });

    return entity;
  }

  // @ProfileResponseTime('ProjectsResolver.updateProject')
  @Mutation(() => ProjectObject, {
    description: `Update a project`,
    nullable: true,
  })
  async updateProject(
    @Args('input', { type: () => UpdateProjectInput })
    input: UpdateProjectInput,
  ): Promise<Project | null> {
    try {
      return await this.projectsRepository.update(input.id, {
        ...(input.name != null && { name: input.name }),
        ...(input.description !== undefined && {
          description: input.description,
        }),
        ...(input.nxProjectName !== undefined && {
          nxProjectName: input.nxProjectName,
        }),
      });
    } catch (error) {
      if (error instanceof NotFoundException) {
        return null;
      }
      throw error;
    }
  }

  // @ProfileResponseTime('ProjectsResolver.deleteProject')
  @Mutation(() => Boolean, {
    description: `Soft-delete a project by ID. Related plans, tasks and repositories remain and keep their project link, which no longer resolves to a project. Returns false when no live project has the ID.`,
  })
  async deleteProject(
    @Args('input', { type: () => DeleteProjectInput })
    input: DeleteProjectInput,
  ): Promise<boolean> {
    try {
      await this.projectsRepository.remove(input.id);

      return true;
    } catch (error) {
      if (error instanceof NotFoundException) {
        return false;
      }
      throw error;
    }
  }

  // @ProfileResponseTime('ProjectsResolver.linkProjectRepository')
  @Mutation(() => ProjectRepositoryObject, {
    description: `Link a repository to a project (many-to-many). Idempotent: linking an already-linked pair returns the existing link. Fails when the project or repository does not exist.`,
  })
  async linkProjectRepository(
    @Args('input', { type: () => LinkProjectRepositoryInput })
    input: LinkProjectRepositoryInput,
  ): Promise<ProjectRepository> {
    const [project, repository] = await Promise.all([
      this.projectsRepository.findOne({ where: { id: input.projectId } }),
      this.repositoriesRepository.findRepositoryById(input.repositoryId),
    ]);
    if (!project) {
      throw new NotFoundException(`Project not found: ${input.projectId}`);
    }
    if (!repository) {
      throw new NotFoundException(
        `Repository not found: ${input.repositoryId}`,
      );
    }

    return this.projectRepositoriesRepository.link(
      input.projectId,
      input.repositoryId,
    );
  }

  // @ProfileResponseTime('ProjectsResolver.unlinkProjectRepository')
  @Mutation(() => Boolean, {
    description: `Remove a repository's link to a project. Returns false when the pair was not linked.`,
  })
  async unlinkProjectRepository(
    @Args('input', { type: () => UnlinkProjectRepositoryInput })
    input: UnlinkProjectRepositoryInput,
  ): Promise<boolean> {
    return this.projectRepositoriesRepository.unlink(
      input.projectId,
      input.repositoryId,
    );
  }

  // @ProfileResponseTime('ProjectsResolver.projectPlans')
  @Query(() => [PlanObject], {
    description: `The live plans of a project in project order (projectSortOrder ascending)`,
  })
  async projectPlans(
    @Args('projectId', { type: () => ID }) projectId: string,
  ): Promise<Plan[]> {
    return this.planProjectMembership.listPlans(projectId);
  }

  // @ProfileResponseTime('ProjectsResolver.projectPlansPage')
  @Query(() => ProjectPlansPageResultObject, {
    description: `One page of a project's live plans in project order (projectSortOrder ascending), plus the project's total live plan count. limit is 1 to ${PAGINATION_MAX_LIMIT} (default ${PAGINATION_DEFAULT_LIMIT}); offset is 0 or more.`,
  })
  async projectPlansPage(
    @Args('input', { type: () => ProjectPlansPageInput })
    input: ProjectPlansPageInput,
  ): Promise<ProjectPlansPageResultObject> {
    assertPagination(input, { max: PAGINATION_MAX_LIMIT });

    const page = await this.planProjectMembership.pagePlans(input.projectId, {
      limit: input.limit,
      offset: input.offset,
    });

    return {
      hasNextPage: hasNextPage(page, input.offset ?? 0),
      items: page.items,
      totalCount: page.totalCount,
    };
  }

  // @ProfileResponseTime('ProjectsResolver.moveProjectPlan')
  @Mutation(() => [PlanObject], {
    description: `Swap a plan's projectSortOrder with its neighbour's in its project's full order (UP = earlier, DOWN = later), touching only those two plans, so a move works across any page boundary. A plan already at that end stays put. Returns every live plan of the project in the resulting order. Fails when the plan does not exist or is in no project.`,
  })
  async moveProjectPlan(
    @Args('input', { type: () => MoveProjectPlanInput })
    input: MoveProjectPlanInput,
  ): Promise<Plan[]> {
    return this.planProjectMembership.movePlan(input.planId, input.direction);
  }

  // @ProfileResponseTime('ProjectsResolver.addPlanToProject')
  @Mutation(() => PlanObject, {
    description: `Add a plan to a project, appended after the project's last plan (a plan in another project moves and lands at the end of this one). Also links the plan's workspace repository to the project when it is set and not yet linked; that link never blocks. Idempotent for a plan already in the project. Fails when the plan or project does not exist.`,
  })
  async addPlanToProject(
    @Args('input', { type: () => AddPlanToProjectInput })
    input: AddPlanToProjectInput,
  ): Promise<Plan> {
    return this.planProjectMembership.addPlan(input.planId, input.projectId);
  }

  // @ProfileResponseTime('ProjectsResolver.removePlanFromProject')
  @Mutation(() => PlanObject, {
    description: `Remove a plan from its project, clearing projectId and projectSortOrder. The project's repository links stay. A plan with no project is returned unchanged.`,
  })
  async removePlanFromProject(
    @Args('input', { type: () => RemovePlanFromProjectInput })
    input: RemovePlanFromProjectInput,
  ): Promise<Plan> {
    return this.planProjectMembership.removePlan(input.planId);
  }

  // @ProfileResponseTime('ProjectsResolver.reorderProjectPlans')
  @Mutation(() => [PlanObject], {
    description: `Reorder the plans of a project. The listed plans take the projectSortOrder values they already hold, in planIds order; plans not listed keep their place. A full list reorders the whole project; a partial list (e.g. one page) reorders only itself, in place. Atomic. Returns every live plan of the project in the new order.`,
  })
  async reorderProjectPlans(
    @Args('input', { type: () => ReorderProjectPlansInput })
    input: ReorderProjectPlansInput,
  ): Promise<Plan[]> {
    return this.planProjectMembership.reorderPlans(
      input.projectId,
      input.planIds,
    );
  }
}
