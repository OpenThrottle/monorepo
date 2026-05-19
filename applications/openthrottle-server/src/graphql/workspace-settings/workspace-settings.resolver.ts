/**
 * @description GraphQL resolver for workspace local repository CRUD (user-scoped).
 */

import type {
  Project,
  WorkspaceLocalRepository,
} from '@openthrottle/nestjs-repositories';
import {
  ProjectsService,
  WorkspaceLocalRepositoriesService,
} from '@openthrottle/nestjs-repositories';
import { CurrentUser } from '@openthrottle/nestjs-auth';
import { UseGuards } from '@nestjs/common';
import {
  Args,
  ID,
  Mutation,
  Parent,
  Query,
  ResolveField,
  Resolver,
} from '@nestjs/graphql';
import { PERMISSIONS, Permissions } from '@openthrottle/nestjs-rbac';
import { GqlPermissionsGuard } from '../../guards/gql-permissions.guard';
import { ProjectObject } from '../projects/project.object';
import {
  CreateWorkspaceLocalRepositoryInput,
  SetWorkspaceLocalRepositoryProjectInput,
  UpdateWorkspaceLocalRepositoryInput,
} from './workspace-settings.input';
import { WorkspaceLocalRepositoryObject } from './workspace-local-repository.object';
import {
  validateAndNormalizeFilesystemPath,
  validateDisplayName,
  validateGitDefaultBranch,
  validateGitRemoteUrl,
} from './workspace-local-repository.validation';

@Resolver(() => WorkspaceLocalRepositoryObject)
@UseGuards(GqlPermissionsGuard)
export class WorkspaceSettingsResolver {
  constructor(
    private readonly workspaceLocalRepositoriesService: WorkspaceLocalRepositoriesService,
    private readonly projectsService: ProjectsService,
  ) {}

  @ResolveField(() => ProjectObject, {
    description: `Cortex project linked to this checkout.`,
    nullable: true,
  })
  async project(
    @Parent() parent: WorkspaceLocalRepositoryObject,
  ): Promise<Project | null> {
    if (!parent.projectId) return null;
    return this.projectsService.findById(parent.projectId);
  }

  @Query(() => WorkspaceLocalRepositoryObject, {
    description: `Get a local repository by id for the authenticated user.`,
    nullable: true,
  })
  @Permissions(PERMISSIONS.SETTINGS_READ)
  async workspaceLocalRepository(
    @CurrentUser('sub') userId: string,
    @Args('id', { type: () => ID }) id: string,
  ): Promise<WorkspaceLocalRepository | null> {
    return this.workspaceLocalRepositoriesService.findByIdForUser(id, userId);
  }

  @Query(() => [WorkspaceLocalRepositoryObject], {
    description: `List local repositories for the authenticated user.`,
  })
  @Permissions(PERMISSIONS.SETTINGS_READ)
  async workspaceLocalRepositories(
    @CurrentUser('sub') userId: string,
  ): Promise<WorkspaceLocalRepository[]> {
    return this.workspaceLocalRepositoriesService.listByUserId(userId);
  }

  @Mutation(() => WorkspaceLocalRepositoryObject, {
    description: `Register a local filesystem repository for the authenticated user.`,
  })
  @Permissions(PERMISSIONS.SETTINGS_WRITE)
  async createWorkspaceLocalRepository(
    @CurrentUser('sub') userId: string,
    @Args('input', { type: () => CreateWorkspaceLocalRepositoryInput })
    input: CreateWorkspaceLocalRepositoryInput,
  ): Promise<WorkspaceLocalRepository> {
    return this.workspaceLocalRepositoriesService.create(userId, {
      displayName: validateDisplayName(input.displayName),
      filesystemPath: validateAndNormalizeFilesystemPath(input.filesystemPath),
      gitDefaultBranch: validateGitDefaultBranch(input.gitDefaultBranch),
      gitRemoteUrl: validateGitRemoteUrl(input.gitRemoteUrl),
      projectId: input.projectId ?? null,
    });
  }

  @Mutation(() => WorkspaceLocalRepositoryObject, {
    description: `Update metadata for a local repository owned by the authenticated user.`,
  })
  @Permissions(PERMISSIONS.SETTINGS_WRITE)
  async updateWorkspaceLocalRepository(
    @CurrentUser('sub') userId: string,
    @Args('input', { type: () => UpdateWorkspaceLocalRepositoryInput })
    input: UpdateWorkspaceLocalRepositoryInput,
  ): Promise<WorkspaceLocalRepository> {
    const patch: {
      displayName?: string;
      gitDefaultBranch?: string | null;
      gitRemoteUrl?: string | null;
      projectId?: string | null;
    } = {};

    if (input.displayName != null) {
      patch.displayName = validateDisplayName(input.displayName);
    }
    if (input.gitRemoteUrl !== undefined) {
      patch.gitRemoteUrl = validateGitRemoteUrl(input.gitRemoteUrl);
    }
    if (input.gitDefaultBranch !== undefined) {
      patch.gitDefaultBranch = validateGitDefaultBranch(input.gitDefaultBranch);
    }
    if (input.projectId !== undefined) {
      patch.projectId = input.projectId;
    }

    return this.workspaceLocalRepositoriesService.update(
      userId,
      input.id,
      patch,
    );
  }

  @Mutation(() => WorkspaceLocalRepositoryObject, {
    description: `Assign, change, or clear the Cortex project link for a local repository.`,
  })
  @Permissions(PERMISSIONS.SETTINGS_WRITE)
  async setWorkspaceLocalRepositoryProject(
    @CurrentUser('sub') userId: string,
    @Args('input', { type: () => SetWorkspaceLocalRepositoryProjectInput })
    input: SetWorkspaceLocalRepositoryProjectInput,
  ): Promise<WorkspaceLocalRepository> {
    return this.workspaceLocalRepositoriesService.setProject(
      userId,
      input.id,
      input.projectId,
    );
  }

  @Mutation(() => Boolean, {
    description: `Remove a local repository owned by the authenticated user.`,
  })
  @Permissions(PERMISSIONS.SETTINGS_WRITE)
  async deleteWorkspaceLocalRepository(
    @CurrentUser('sub') userId: string,
    @Args('id', { type: () => ID }) id: string,
  ): Promise<boolean> {
    return this.workspaceLocalRepositoriesService.delete(userId, id);
  }
}
