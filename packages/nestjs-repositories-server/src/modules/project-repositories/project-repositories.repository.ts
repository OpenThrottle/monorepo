import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  BaseRepository,
  isUniqueViolation,
} from '@openthrottle/nestjs-postgres';
import { Repository } from 'typeorm';

import type { Project } from '../projects/project.entity.ts';
import type { Repository as RepositoryRow } from '../repositories/repository.entity.ts';
import type {
  ProjectRepositoryCreateInput,
  ProjectsByRepositoryId,
  RepositoriesByProjectId,
} from './project-repositories.types.ts';
import { ProjectRepository } from './project-repository.entity.ts';

/**
 * @description Data access for the openthrottle `project_repositories` table on the default
 * connection: the `BaseRepository` CRUD (hard deletes, since an unlinked pair is simply
 * re-linked) plus idempotent link/unlink, the batched reads behind `Project.repositories` and
 * `Repository.projects` (live rows only), and `syncLegacyProject`, which keeps the join table
 * in step with the deprecated single `repositories.project_id`.
 * @public
 */
@Injectable()
export class ProjectRepositoriesRepository extends BaseRepository<
  ProjectRepository,
  ProjectRepositoryCreateInput
> {
  protected readonly tableName = 'project_repositories';

  constructor(
    @InjectRepository(ProjectRepository)
    repository: Repository<ProjectRepository>,
  ) {
    super(repository);
  }

  /**
   * @description Finds the link for one (project, repository) pair, or null.
   */
  async findByProjectAndRepository(
    projectId: string,
    repositoryId: string,
  ): Promise<ProjectRepository | null> {
    return this.findOne({ where: { projectId, repositoryId } });
  }

  /**
   * @description Ensures the (project, repository) link exists and returns it. Linking an
   * already-linked pair returns the existing row; losing an insert race to a concurrent link
   * also resolves to the winner's row.
   */
  async link(
    projectId: string,
    repositoryId: string,
  ): Promise<ProjectRepository> {
    const existing = await this.findByProjectAndRepository(
      projectId,
      repositoryId,
    );
    if (existing) return existing;

    try {
      return await this.create({ projectId, repositoryId });
    } catch (error) {
      if (!isUniqueViolation(error)) throw error;
      const winner = await this.findByProjectAndRepository(
        projectId,
        repositoryId,
      );
      if (winner) return winner;
      throw error;
    }
  }

  /**
   * @description Removes the (project, repository) link. Returns false when the pair was not
   * linked.
   */
  async unlink(projectId: string, repositoryId: string): Promise<boolean> {
    const result = await this.repository.delete({ projectId, repositoryId });
    return (result.affected ?? 0) > 0;
  }

  /**
   * @description Mirrors a change of the deprecated single `repositories.project_id` onto the
   * join table: a repository moving from project P to Q loses (P, repo) and gains (Q, repo); a
   * cleared project (`next` null) loses (P, repo); a newly set one gains its link. Nothing
   * happens when the two ids are equal beyond ensuring the link exists.
   */
  async syncLegacyProject(
    repositoryId: string,
    previousProjectId: string | null,
    nextProjectId: string | null,
  ): Promise<void> {
    if (previousProjectId !== null && previousProjectId !== nextProjectId) {
      await this.unlink(previousProjectId, repositoryId);
    }
    if (nextProjectId !== null) {
      await this.link(nextProjectId, repositoryId);
    }
  }

  /**
   * @description Live repositories of each given project, oldest link first. Soft-deleted
   * repositories are left out; a project with none has no entry.
   */
  async listRepositoriesByProjectIds(
    projectIds: readonly string[],
  ): Promise<RepositoriesByProjectId> {
    const grouped = new Map<string, RepositoryRow[]>();
    if (projectIds.length === 0) return grouped;

    const links = await this.repository
      .createQueryBuilder('link')
      .innerJoinAndSelect('link.repository', 'repository')
      .where('link.project_id IN (:...projectIds)', { projectIds })
      .orderBy('link.created_at', 'ASC')
      .getMany();

    for (const link of links) {
      if (!link.repository) continue;
      grouped.set(link.projectId, [
        ...(grouped.get(link.projectId) ?? []),
        link.repository,
      ]);
    }
    return grouped;
  }

  /**
   * @description Live projects of each given repository, oldest link first. Soft-deleted
   * projects are left out; a repository with none has no entry.
   */
  async listProjectsByRepositoryIds(
    repositoryIds: readonly string[],
  ): Promise<ProjectsByRepositoryId> {
    const grouped = new Map<string, Project[]>();
    if (repositoryIds.length === 0) return grouped;

    const links = await this.repository
      .createQueryBuilder('link')
      .innerJoinAndSelect('link.project', 'project')
      .where('link.repository_id IN (:...repositoryIds)', { repositoryIds })
      .orderBy('link.created_at', 'ASC')
      .getMany();

    for (const link of links) {
      if (!link.project) continue;
      grouped.set(link.repositoryId, [
        ...(grouped.get(link.repositoryId) ?? []),
        link.project,
      ]);
    }
    return grouped;
  }
}
