/**
 * @description CRUD for workspace_local_repositories scoped to the authenticated user.
 */

import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LoggerService } from '@openthrottle/nestjs-modules';
import { QueryFailedError, Repository } from 'typeorm';
import { ProjectsService } from '../projects/projects.service';
import { WorkspaceLocalRepository } from './workspace-local-repository.entity';

export interface CreateWorkspaceLocalRepositoryData {
  readonly displayName: string;
  readonly filesystemPath: string;
  readonly gitDefaultBranch: string | null;
  readonly gitRemoteUrl: string | null;
  readonly projectId: string | null;
}

export interface UpdateWorkspaceLocalRepositoryData {
  readonly displayName?: string;
  readonly gitDefaultBranch?: string | null;
  readonly gitRemoteUrl?: string | null;
  readonly projectId?: string | null;
}

const isUniqueViolation = (error: unknown): boolean => {
  if (!(error instanceof QueryFailedError)) return false;
  const driverError = error.driverError as { code?: string } | undefined;
  return driverError?.code === '23505';
};

@Injectable()
export class WorkspaceLocalRepositoriesService {
  constructor(
    private readonly logger: LoggerService,
    @InjectRepository(WorkspaceLocalRepository)
    private readonly repository: Repository<WorkspaceLocalRepository>,
    private readonly projectsService: ProjectsService,
  ) {
    this.logger.debug('🧩 workspace-local-repositories 🧩');
  }

  /**
   * @description Returns the TypeORM repository for workspace local repositories.
   */
  getRepository(): Repository<WorkspaceLocalRepository> {
    return this.repository;
  }

  /**
   * @description Lists repositories for a user, newest first.
   */
  async listByUserId(userId: string): Promise<WorkspaceLocalRepository[]> {
    return this.repository.find({
      order: { createdAt: 'DESC' },
      where: { userId },
    });
  }

  /**
   * @description Finds a repository by id when owned by the user.
   */
  async findByIdForUser(
    id: string,
    userId: string,
  ): Promise<WorkspaceLocalRepository | null> {
    return this.repository.findOne({ where: { id, userId } });
  }

  /**
   * @description Creates a local repository row for the user.
   */
  async create(
    userId: string,
    data: CreateWorkspaceLocalRepositoryData,
  ): Promise<WorkspaceLocalRepository> {
    await this.assertProjectExistsWhenSet(data.projectId);

    const entity = this.repository.create({
      displayName: data.displayName,
      filesystemPath: data.filesystemPath,
      gitDefaultBranch: data.gitDefaultBranch,
      gitRemoteUrl: data.gitRemoteUrl,
      projectId: data.projectId,
      userId,
    });

    try {
      return await this.repository.save(entity);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException(
          'A local repository with this filesystem path is already registered',
        );
      }
      throw error;
    }
  }

  /**
   * @description Updates metadata for an owned repository. Does not change filesystem_path.
   */
  async update(
    userId: string,
    id: string,
    data: UpdateWorkspaceLocalRepositoryData,
  ): Promise<WorkspaceLocalRepository> {
    const existing = await this.findByIdForUser(id, userId);
    if (!existing) {
      throw new NotFoundException('Workspace local repository not found');
    }

    if (data.projectId !== undefined) {
      await this.assertProjectExistsWhenSet(data.projectId);
      existing.projectId = data.projectId;
    }
    if (data.displayName !== undefined) {
      existing.displayName = data.displayName;
    }
    if (data.gitRemoteUrl !== undefined) {
      existing.gitRemoteUrl = data.gitRemoteUrl;
    }
    if (data.gitDefaultBranch !== undefined) {
      existing.gitDefaultBranch = data.gitDefaultBranch;
    }

    try {
      return await this.repository.save(existing);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException(
          'A local repository with this filesystem path is already registered',
        );
      }
      throw error;
    }
  }

  /**
   * @description Assigns, changes, or clears the Cortex project link for an owned repository.
   */
  async setProject(
    userId: string,
    id: string,
    projectId: string | null,
  ): Promise<WorkspaceLocalRepository> {
    return this.update(userId, id, { projectId });
  }

  /**
   * @description Deletes an owned repository. Returns false when not found.
   */
  async delete(userId: string, id: string): Promise<boolean> {
    const result = await this.repository.delete({ id, userId });
    return (result.affected ?? 0) > 0;
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
