/**
 * @description GraphQL surface for the add-folder onboarding gesture:
 * discovery, browsing, addWorkspaceFolder, refreshCheckout, and the
 * repository-grouped listing. Paths are on the server host.
 */

import { UseGuards } from '@nestjs/common';
import {
  Args,
  Context,
  ID,
  Mutation,
  Parent,
  Query,
  ResolveField,
  Resolver,
} from '@nestjs/graphql';
import { CurrentUser } from '@openthrottle/nestjs-auth';
import { PERMISSIONS, Permissions } from '@openthrottle/nestjs-rbac';
import type { Project } from '@openthrottle/nestjs-repositories';
import { GqlPermissionsGuard } from '../../guards/gql-permissions.guard';
import { ProjectObject } from '../projects/project.object';
import { RepositoryObject } from './repository.object';
import {
  AddWorkspaceFolderInput,
  CloneRepositoryInput,
  RefreshCheckoutInput,
  UpdateRepositoryInput,
} from './workspace-folders.input';
import {
  AddWorkspaceFolderPayloadObject,
  DiscoveredFolderObject,
  PickFolderNativePayloadObject,
  RefreshCheckoutPayloadObject,
  WorkspaceDirectoryListingObject,
  WorkspacePickerCapabilitiesObject,
} from './workspace-folders.object';
import { WorkspaceFoldersService } from './workspace-folders.service';
import { WorkspaceSettingsLoaders } from './workspace-settings-loaders';

@Resolver(() => RepositoryObject)
@UseGuards(GqlPermissionsGuard)
export class WorkspaceFoldersResolver {
  constructor(
    private readonly loaders: WorkspaceSettingsLoaders,
    private readonly workspaceFoldersService: WorkspaceFoldersService,
  ) {}

  @ResolveField(() => ProjectObject, {
    description: `OpenThrottle project linked at the repository level.`,
    nullable: true,
  })
  async project(@Parent() parent: RepositoryObject): Promise<Project | null> {
    if (!parent.projectId) return null;
    return this.loaders.projectLoader.load(parent.projectId);
  }

  @Query(() => [DiscoveredFolderObject], {
    description: `Git repositories found one level under the configured workspace roots (server-host paths); empty when OPENTHROTTLE_WORKSPACE_ROOTS is unset.`,
  })
  @Permissions(PERMISSIONS.SETTINGS_READ)
  async discoveredFolders(
    @CurrentUser('sub') userId: string,
  ): Promise<DiscoveredFolderObject[]> {
    return this.workspaceFoldersService.discoveredFolders(userId);
  }

  @Query(() => WorkspaceDirectoryListingObject, {
    description: `Interactive directory listing for the in-app picker: immediate subdirectories (annotated with isGitRepo / alreadyRegistered) plus navigation context (current + parent path, current-is-git-repo). With no path, lists the configured workspace roots as entries. All paths are on the server host.`,
  })
  @Permissions(PERMISSIONS.SETTINGS_READ)
  async browseDirectory(
    @CurrentUser('sub') userId: string,
    @Args('path', { nullable: true, type: () => String })
    path?: string | null,
  ): Promise<WorkspaceDirectoryListingObject> {
    return this.workspaceFoldersService.browseDirectory(userId, path);
  }

  @Query(() => WorkspacePickerCapabilitiesObject, {
    description: `Seed data for the add-folder picker: whether a native OS folder dialog can be opened on the server host for this request, the configured workspace roots (host view), and a default path to open the in-app picker at.`,
  })
  @Permissions(PERMISSIONS.SETTINGS_READ)
  workspacePickerCapabilities(
    @Context() context: { req?: { socket?: { remoteAddress?: string } } },
  ): WorkspacePickerCapabilitiesObject {
    const remoteAddress = context.req?.socket?.remoteAddress ?? null;
    return this.workspaceFoldersService.workspacePickerCapabilities(
      remoteAddress,
    );
  }

  @Query(() => [RepositoryObject], {
    description: `The authenticated user's repositories with their checkouts and inspection snapshots (snapshots refresh on view past the 15-minute TTL).`,
  })
  @Permissions(PERMISSIONS.SETTINGS_READ)
  async workspaceRepositories(
    @CurrentUser('sub') userId: string,
  ): Promise<RepositoryObject[]> {
    return this.workspaceFoldersService.workspaceRepositories(userId);
  }

  @Query(() => RepositoryObject, {
    description: `A single repository the authenticated user has a checkout of, with those checkouts and inspection snapshots; null when the user owns no checkout of it.`,
    nullable: true,
  })
  @Permissions(PERMISSIONS.SETTINGS_READ)
  async workspaceRepository(
    @CurrentUser('sub') userId: string,
    @Args('id', { type: () => ID }) id: string,
  ): Promise<RepositoryObject | null> {
    return this.workspaceFoldersService.workspaceRepository(userId, id);
  }

  @Mutation(() => PickFolderNativePayloadObject, {
    description: `Open the host OS folder dialog and return the chosen absolute server-host path, or null on user-cancel. Guarded by the same same-machine predicate as workspacePickerCapabilities (re-checked before spawning) and bounded by a kill timeout. Does not register anything — the client confirms and calls addWorkspaceFolder.`,
  })
  @Permissions(PERMISSIONS.SETTINGS_WRITE)
  async pickFolderNative(
    @Context() context: { req?: { socket?: { remoteAddress?: string } } },
  ): Promise<PickFolderNativePayloadObject> {
    const remoteAddress = context.req?.socket?.remoteAddress ?? null;
    return this.workspaceFoldersService.pickFolderNative(remoteAddress);
  }

  @Mutation(() => AddWorkspaceFolderPayloadObject, {
    description: `Register a server-host folder: validates and inspects the path, reconciles identity via the OT manifest or normalized git remote, creates or relinks the checkout, and returns the enriched graph.`,
  })
  @Permissions(PERMISSIONS.SETTINGS_WRITE)
  async addWorkspaceFolder(
    @CurrentUser('sub') userId: string,
    @Args('input', { type: () => AddWorkspaceFolderInput })
    input: AddWorkspaceFolderInput,
  ): Promise<AddWorkspaceFolderPayloadObject> {
    return this.workspaceFoldersService.addWorkspaceFolder(userId, input);
  }

  @Mutation(() => AddWorkspaceFolderPayloadObject, {
    description: `Clone a git repository into OPENTHROTTLE_CHECKOUT_ROOT using ambient host credentials, then register it as a managed checkout via the same pipeline as addWorkspaceFolder. A failed clone leaves no rows and no partial directory; OT stores no credentials.`,
  })
  @Permissions(PERMISSIONS.SETTINGS_WRITE)
  async cloneRepository(
    @CurrentUser('sub') userId: string,
    @Args('input', { type: () => CloneRepositoryInput })
    input: CloneRepositoryInput,
  ): Promise<AddWorkspaceFolderPayloadObject> {
    return this.workspaceFoldersService.cloneRepository(userId, input);
  }

  @Mutation(() => RefreshCheckoutPayloadObject, {
    description: `Re-run inspection on an owned checkout and surface drift (path missing, remote changed, branch moved).`,
  })
  @Permissions(PERMISSIONS.SETTINGS_WRITE)
  async refreshCheckout(
    @CurrentUser('sub') userId: string,
    @Args('input', { type: () => RefreshCheckoutInput })
    input: RefreshCheckoutInput,
  ): Promise<RefreshCheckoutPayloadObject> {
    return this.workspaceFoldersService.refreshCheckout(userId, input.id);
  }

  @Mutation(() => RepositoryObject, {
    description: `Edit an owned repository's name, default branch, and/or project link. Requires the authenticated user to own a checkout of the repository.`,
  })
  @Permissions(PERMISSIONS.SETTINGS_WRITE)
  async updateRepository(
    @CurrentUser('sub') userId: string,
    @Args('input', { type: () => UpdateRepositoryInput })
    input: UpdateRepositoryInput,
  ): Promise<RepositoryObject> {
    return this.workspaceFoldersService.updateRepository(userId, input);
  }
}
