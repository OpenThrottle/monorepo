import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { UserFavoriteProject } from './user-favorite-project.entity.ts';

/**
 * @description Data access for the openthrottle `user_favorite_projects` table on the default
 * connection. Keyed by `(user_id, project_id)`, so it is a plain repository rather than a
 * `BaseRepository` (see the package AGENTS.md, natural-key tables).
 * @public
 */
@Injectable()
export class UserFavoriteProjectsRepository {
  constructor(
    @InjectRepository(UserFavoriteProject)
    private readonly repository: Repository<UserFavoriteProject>,
  ) {}

  /**
   * @description The ids of the projects the user has starred, oldest star first; empty when
   * the user has starred nothing.
   */
  async listFavoriteProjectIds(userId: string): Promise<readonly string[]> {
    const rows = await this.repository.find({
      order: { createdAt: 'ASC' },
      where: { userId },
    });
    return rows.map((row) => row.projectId);
  }

  /**
   * @description Stars or unstars a project for a user, idempotently: starring twice keeps one
   * row, unstarring a project that was never starred is a no-op.
   */
  async setProjectFavorite(
    userId: string,
    projectId: string,
    favorite: boolean,
  ): Promise<void> {
    if (!favorite) {
      await this.repository.delete({ projectId, userId });
      return;
    }

    await this.repository
      .createQueryBuilder()
      .insert()
      .values({ projectId, userId })
      .orIgnore()
      .execute();
  }
}
