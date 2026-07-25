/**
 * @description Compatibility façade over repositories + repository_checkouts,
 * keeping the pre-split WorkspaceLocalRepository API (list/find/create/update/
 * setProject/delete) so existing callers keep working until the new GraphQL
 * surface replaces them. `id` in every view is the checkout id.
 *
 * @deprecated Use RepositoriesService / RepositoryCheckoutsService directly.
 */

import { Injectable, NotFoundException } from '@nestjs/common';
import { LoggerService } from '@openthrottle/nestjs-modules';
import type { ListPaginationInput } from '../../common/list-pagination';
import { ProjectsService } from '../projects/projects.service';
import { normalizeRemoteUrl } from '../repositories/normalize-remote-url';
import { RepositoriesService } from '../repositories/repositories.service';
import type { Repository } from '../repositories/repository.entity';
import type { RepositoryCheckout } from '../repositories/repository-checkout.entity';
import { RepositoryCheckoutsService } from '../repositories/repository-checkouts.service';
import type { WorkspaceLocalRepository } from './workspace-local-repository.entity';

interface CreateWorkspaceLocalRepositoryData {
  readonly displayName: string;
  readonly filesystemPath: string;
  readonly gitDefaultBranch: string | null;
  readonly gitRemoteUrl: string | null;
  readonly projectId: string | null;
}

interface UpdateWorkspaceLocalRepositoryData {
  readonly displayName?: string;
  readonly gitDefaultBranch?: string | null;
  readonly gitRemoteUrl?: string | null;
  readonly projectId?: string | null;
}

const toView = (
  checkout: RepositoryCheckout,
  repository: Repository,
): WorkspaceLocalRepository => ({
  createdAt: checkout.createdAt,
  displayName: checkout.displayName,
  filesystemPath: checkout.filesystemPath,
  gitDefaultBranch: repository.defaultBranch,
  gitRemoteUrl: repository.normalizedRemoteUrl,
  id: checkout.id,
  projectId: repository.projectId,
  updatedAt: checkout.updatedAt,
  userId: checkout.userId,
});

@Injectable()
export class WorkspaceLocalRepositoriesService {
  constructor(
    private readonly logger: LoggerService,
    private readonly checkoutsService: RepositoryCheckoutsService,
    private readonly projectsService: ProjectsService,
    private readonly repositoriesService: RepositoriesService,
  ) {
    this.logger.debug('🧩 workspace-local-repositories 🧩');
  }

  /**
   * @description Lists the user's checkouts as legacy views, newest first.
   */
  async listByUserId(
    userId: string,
    pagination?: ListPaginationInput,
  ): Promise<WorkspaceLocalRepository[]> {
    const checkouts = await this.checkoutsService.listByUserId(
      userId,
      pagination,
    );
    return Promise.all(
      checkouts.map(async (checkout) =>
        toView(checkout, await this.repositoryFor(checkout)),
      ),
    );
  }

  /**
   * @description Finds a checkout by id when owned by the user.
   */
  async findByIdForUser(
    id: string,
    userId: string,
  ): Promise<WorkspaceLocalRepository | null> {
    const checkout = await this.checkoutsService.findByIdForUser(id, userId);
    if (!checkout) return null;
    return toView(checkout, await this.repositoryFor(checkout));
  }

  /**
   * @description Registers a folder: find-or-create the repository row from the
   * remote URL (provisional when none), then create the user's checkout.
   */
  async create(
    userId: string,
    data: CreateWorkspaceLocalRepositoryData,
  ): Promise<WorkspaceLocalRepository> {
    await this.assertProjectExistsWhenSet(data.projectId);

    const repository = await this.repositoriesService.findOrCreateByRemoteUrl(
      data.gitRemoteUrl,
      {
        defaultBranch: data.gitDefaultBranch,
        name: data.displayName,
        projectId: data.projectId,
      },
    );

    // An existing repository without a link inherits the explicit one; an
    // existing link wins (repository-level ownership, design doc §4).
    if (data.projectId !== null && repository.projectId === null) {
      await this.repositoriesService.update(repository.id, {
        projectId: data.projectId,
      });
      repository.projectId = data.projectId;
    }

    try {
      const checkout = await this.checkoutsService.create(userId, {
        displayName: data.displayName,
        filesystemPath: data.filesystemPath,
        repositoryId: repository.id,
      });
      return toView(checkout, repository);
    } catch (error) {
      await this.cleanupOrphanProvisional(repository.id);
      throw error;
    }
  }

  /**
   * @description Updates a checkout and/or its repository. Display name lands
   * on the checkout; branch, remote, and project link land on the repository.
   */
  async update(
    userId: string,
    id: string,
    data: UpdateWorkspaceLocalRepositoryData,
  ): Promise<WorkspaceLocalRepository> {
    let checkout = await this.checkoutsService.findByIdForUser(id, userId);
    if (!checkout) {
      throw new NotFoundException('Workspace local repository not found');
    }
    let repository = await this.repositoryFor(checkout);

    if (data.projectId !== undefined) {
      await this.assertProjectExistsWhenSet(data.projectId);
      repository =
        (await this.repositoriesService.update(repository.id, {
          projectId: data.projectId,
        })) ?? repository;
    }
    if (data.gitDefaultBranch !== undefined) {
      repository =
        (await this.repositoriesService.update(repository.id, {
          defaultBranch: data.gitDefaultBranch,
        })) ?? repository;
    }
    if (data.gitRemoteUrl !== undefined) {
      const result = await this.reresolveRemote(
        userId,
        checkout,
        repository,
        data.gitRemoteUrl,
      );
      checkout = result.checkout;
      repository = result.repository;
    }
    if (data.displayName !== undefined) {
      checkout =
        (await this.checkoutsService.updateDisplayName(
          userId,
          id,
          data.displayName,
        )) ?? checkout;
    }

    return toView(checkout, repository);
  }

  /**
   * @description Assigns, changes, or clears the OpenThrottle project link on
   * the checkout's repository.
   */
  async setProject(
    userId: string,
    id: string,
    projectId: string | null,
  ): Promise<WorkspaceLocalRepository> {
    return this.update(userId, id, { projectId });
  }

  /**
   * @description Deletes an owned checkout; a provisional repository left with
   * no checkouts is removed too. Returns false when not found.
   */
  async delete(userId: string, id: string): Promise<boolean> {
    const checkout = await this.checkoutsService.findByIdForUser(id, userId);
    if (!checkout) return false;

    const deleted = await this.checkoutsService.delete(userId, id);
    if (deleted) {
      await this.cleanupOrphanProvisional(checkout.repositoryId);
    }
    return deleted;
  }

  /**
   * @description Moves a checkout onto the repository row matching a changed
   * remote URL: reuse the canonical row when one exists (its project link
   * wins), promote a solely-owned provisional row in place, or split off a
   * fresh row when the current one is shared.
   */
  private async reresolveRemote(
    userId: string,
    checkout: RepositoryCheckout,
    repository: Repository,
    rawRemoteUrl: string | null,
  ): Promise<{ checkout: RepositoryCheckout; repository: Repository }> {
    const normalized =
      rawRemoteUrl === null ? null : normalizeRemoteUrl(rawRemoteUrl);
    if (normalized === repository.normalizedRemoteUrl) {
      return { checkout, repository };
    }

    if (normalized !== null) {
      const canonical =
        await this.repositoriesService.findByNormalizedRemoteUrl(normalized);
      if (canonical) {
        const repointed = await this.checkoutsService.repointRepository(
          userId,
          checkout.id,
          canonical.id,
        );
        await this.cleanupOrphanProvisional(repository.id);
        return { checkout: repointed ?? checkout, repository: canonical };
      }

      const checkoutCount = await this.checkoutsService.countByRepositoryId(
        repository.id,
      );
      if (repository.normalizedRemoteUrl === null && checkoutCount === 1) {
        const promoted = await this.repositoriesService.update(repository.id, {
          normalizedRemoteUrl: normalized,
        });
        return { checkout, repository: promoted ?? repository };
      }
    }

    const split = await this.repositoriesService.create({
      defaultBranch: repository.defaultBranch,
      name: repository.name,
      normalizedRemoteUrl: normalized,
      projectId: repository.projectId,
    });
    const repointed = await this.checkoutsService.repointRepository(
      userId,
      checkout.id,
      split.id,
    );
    await this.cleanupOrphanProvisional(repository.id);
    return { checkout: repointed ?? checkout, repository: split };
  }

  private async repositoryFor(
    checkout: RepositoryCheckout,
  ): Promise<Repository> {
    const repository =
      checkout.repository ??
      (await this.repositoriesService.findById(checkout.repositoryId));
    if (!repository) {
      throw new NotFoundException(
        `Repository not found for checkout: ${checkout.id}`,
      );
    }
    return repository;
  }

  private async cleanupOrphanProvisional(repositoryId: string): Promise<void> {
    const repository = await this.repositoriesService.findById(repositoryId);
    if (!repository || repository.normalizedRemoteUrl !== null) return;
    const count = await this.checkoutsService.countByRepositoryId(repositoryId);
    if (count === 0) {
      await this.repositoriesService.delete(repositoryId);
    }
  }

  private async assertProjectExistsWhenSet(
    projectId: string | null,
  ): Promise<void> {
    if (projectId === null) return;
    const project = await this.projectsService.findById(projectId);
    if (!project) {
      throw new NotFoundException(`Project not found: ${projectId}`);
    }
  }
}
