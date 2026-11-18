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
import type {
  Plan,
  Project,
  Task,
} from '@openthrottle/nestjs-repositories-server';
import { ProjectsRepository } from '@openthrottle/nestjs-repositories-server';

import { PlanObject } from '../plans/plan.object.ts';
import { TaskObject } from '../tasks/task.object.ts';
import { ProjectsLoaders } from './loaders/loaders.service.ts';
import {
  CreateProjectInput,
  DeleteProjectInput,
  UpdateProjectInput,
} from './project.input.ts';
import { ProjectObject } from './project.object.ts';

// @authz-stance: authenticated-only (Path A — see OT plan 18e16dfc-4f22-43f9-9b77-6fc90309b60a)
@Resolver(() => ProjectObject)
export class ProjectsResolver {
  constructor(
    private readonly projectRelationLoaders: ProjectsLoaders,
    private readonly projectsRepository: ProjectsRepository,
  ) {}

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
    description: `Delete a project by ID. Related plans and tasks remain; their project link is cleared (ON DELETE SET NULL).`,
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
}
