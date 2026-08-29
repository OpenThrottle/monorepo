/**
 * @description GraphQL resolver for workspace local repository CRUD (user-scoped).
 */

import type {
  Project,
  UserWorkspaceSettings,
  WorkspaceLocalRepository,
} from '@openthrottle/nestjs-repositories';
import {
  UserWorkspaceSettingsService,
  WorkspaceEditorConfigService,
  WorkspaceLocalRepositoriesService,
} from '@openthrottle/nestjs-repositories';
import { CurrentUser } from '@openthrottle/nestjs-auth';
import { ConfigService } from '@nestjs/config';
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
import { ApplyWorkspaceEditorConfigurationInput } from './apply-workspace-editor-configuration.input';
import { ApplyWorkspaceEditorConfigurationResultObject } from './workspace-editor-config-application.object';
import {
  CreateWorkspaceLocalRepositoryInput,
  SetWorkspaceLocalRepositoryProjectInput,
  UpdateWorkspaceLocalRepositoryInput,
  UpdateWorkspaceProfileInput,
} from './workspace-settings.input';
import { UserWorkspaceProfileObject } from './user-workspace-profile.object';
import {
  toUserWorkspaceProfileObject,
  toWorkspaceEditorIdEnum,
} from './user-workspace-profile.mapper';
import {
  validateContactDisplayName,
  validateContactEmail,
  validateEnabledEditors,
} from './user-workspace-profile.validation';
import { WorkspaceLocalRepositoryObject } from './workspace-local-repository.object';
import { WorkspaceSettingsLoaders } from './workspace-settings-loaders';
import { WorkspaceSettingsObject } from './workspace-settings.object';
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
    private readonly userWorkspaceSettingsService: UserWorkspaceSettingsService,
    private readonly workspaceLocalRepositoriesService: WorkspaceLocalRepositoriesService,
    private readonly workspaceEditorConfigService: WorkspaceEditorConfigService,
    private readonly loaders: WorkspaceSettingsLoaders,
    private readonly configService: ConfigService,
  ) {}

  @Query(() => WorkspaceSettingsObject, {
    description: `Workspace settings for the authenticated user (profile and local repositories).`,
  })
  @Permissions(PERMISSIONS.SETTINGS_READ)
  async workspaceSettings(
    @CurrentUser('sub') userId: string,
  ): Promise<WorkspaceSettingsObject> {
    const [profile, localRepositories] = await Promise.all([
      this.userWorkspaceSettingsService.getOrCreateForUser(userId),
      this.workspaceLocalRepositoriesService.listByUserId(userId),
    ]);

    return {
      localRepositories,
      profile: toUserWorkspaceProfileObject(profile),
    };
  }

  @Mutation(() => UserWorkspaceProfileObject, {
    description: `Update contact fields and/or enabled editors on the authenticated user's workspace profile.`,
  })
  @Permissions(PERMISSIONS.SETTINGS_WRITE)
  async updateWorkspaceProfile(
    @CurrentUser('sub') userId: string,
    @Args('input', { type: () => UpdateWorkspaceProfileInput })
    input: UpdateWorkspaceProfileInput,
  ): Promise<UserWorkspaceSettings> {
    const patch: {
      contactDisplayName?: string | null;
      contactEmail?: string | null;
      enabledEditors?: UserWorkspaceSettings['enabledEditors'];
    } = {};

    if (input.contactDisplayName !== undefined) {
      patch.contactDisplayName = validateContactDisplayName(
        input.contactDisplayName,
      );
    }
    if (input.contactEmail !== undefined) {
      patch.contactEmail = validateContactEmail(input.contactEmail);
    }
    const enabledEditors = validateEnabledEditors(input.enabledEditors);
    if (enabledEditors !== undefined) {
      patch.enabledEditors = enabledEditors;
    }

    const updated = await this.userWorkspaceSettingsService.updateProfile(
      userId,
      patch,
    );

    return toUserWorkspaceProfileObject(updated);
  }

  @ResolveField(() => ProjectObject, {
    description: `OpenThrottle project linked to this checkout.`,
    nullable: true,
  })
  async project(
    @Parent() parent: WorkspaceLocalRepositoryObject,
  ): Promise<Project | null> {
    if (!parent.projectId) return null;
    return this.loaders.projectLoader.load(parent.projectId);
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
    deprecationReason: `Replaced by addWorkspaceFolder (repository/checkout model with auto-detected git metadata).`,
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
    deprecationReason: `Replaced by the repository/checkout model (refreshCheckout re-derives git metadata from disk).`,
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
    deprecationReason: `Project links now live on the repository row; use the repository-level surface.`,
    description: `Assign, change, or clear the OpenThrottle project link for a local repository.`,
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
      input.projectId ?? null,
    );
  }

  @Mutation(() => ApplyWorkspaceEditorConfigurationResultObject, {
    description: `Apply enabled editor configuration (MCP, skills paths, rules dirs) to linked local repositories.`,
  })
  @Permissions(PERMISSIONS.SETTINGS_WRITE)
  async applyWorkspaceEditorConfiguration(
    @CurrentUser('sub') userId: string,
    @Args('input', {
      nullable: true,
      type: () => ApplyWorkspaceEditorConfigurationInput,
    })
    input?: ApplyWorkspaceEditorConfigurationInput | null,
  ): Promise<ApplyWorkspaceEditorConfigurationResultObject> {
    const apiBaseUrl =
      this.configService.get<string>('API_URL_INTERNAL') ??
      `http://localhost:${this.configService.get<string>('PORT') ?? '6021'}`;

    const applications = await this.workspaceEditorConfigService.applyForUser(
      userId,
      {
        apiBaseUrl,
        repositoryIds: input?.repositoryIds ?? undefined,
      },
    );

    return {
      applications: applications.map((application) => ({
        editor: toWorkspaceEditorIdEnum(application.editor),
        filesWritten: [...application.filesWritten],
        filesystemPath: application.filesystemPath,
        repositoryId: application.repositoryId,
        warnings: [...application.warnings],
      })),
    };
  }

  @Mutation(() => Boolean, {
    deprecationReason: `Replaced by the repository/checkout model; checkout removal moves to the new surface.`,
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
