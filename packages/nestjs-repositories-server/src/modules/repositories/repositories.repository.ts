import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { BaseRepository } from '@openthrottle/nestjs-postgres';
import type { EntityManager } from 'typeorm';
import { IsNull, Repository as OrmRepository } from 'typeorm';

import { RepositoryCheckout } from '../repository-checkouts/repository-checkout.entity.ts';
import { normalizeRemoteUrl } from './remote-url/remote-url.utils.ts';
import type {
  MergeDetectedRemoteResult,
  RepositoryCreateInput,
  UpdateRepositoryInput,
} from './repositories.types.ts';
import { Repository } from './repository.entity.ts';

/**
 * @description Data access for the openthrottle `repositories` table on the default connection:
 * the `BaseRepository` CRUD plus find-or-create by remote URL (identity = normalized git remote
 * URL; provisional rows carry NULL until a remote is detected). A delete is a soft delete, which
 * fires none of the foreign key actions, so `remove` and `removeRepository` cascade to the
 * repository's checkouts themselves; see migration 178. The inherited `findById` throws on a
 * miss, so the nullable lookup is `findRepositoryById` and the nullable update is
 * `updateRepository`.
 * @public
 */
@Injectable()
export class RepositoriesRepository extends BaseRepository<
  Repository,
  RepositoryCreateInput
> {
  protected readonly tableName = 'repositories';

  constructor(
    @InjectRepository(Repository)
    repository: OrmRepository<Repository>,
  ) {
    super(repository);
  }

  /**
   * @description Soft deletes a live repository and every live checkout of it in one
   * transaction, then returns the deleted repository. Rows that reference a checkout keep its
   * id (a soft delete fires no ON DELETE SET NULL).
   * @throws NotFoundException when no live repository has that id (including already deleted).
   */
  override async remove(id: string): Promise<Repository> {
    return this.repository.manager.transaction(async (manager) => {
      const removed = await this.softDeleteWithCheckouts(manager, id);
      if (!removed) {
        throw new NotFoundException(
          `${this.tableName} record with ID "${id}" not found`,
        );
      }
      return manager.findOneOrFail(Repository, {
        where: { id },
        withDeleted: true,
      });
    });
  }

  /**
   * @description Finds a live repository by id. Returns null when not found; the inherited
   * `findById` throws instead.
   */
  async findRepositoryById(id: string): Promise<Repository | null> {
    return this.findOne({ where: { id } });
  }

  /**
   * @description Finds the canonical live repository for a normalized remote URL.
   */
  async findByNormalizedRemoteUrl(
    normalizedRemoteUrl: string,
  ): Promise<Repository | null> {
    return this.findOne({ where: { normalizedRemoteUrl } });
  }

  /**
   * @description Resolves a raw remote URL to its canonical repository row,
   * creating one when none exists. A null/unrecognizable URL creates a fresh
   * provisional repository (no identity to dedupe on). When the row already
   * exists its fields win; `defaults` only seed a newly created row.
   */
  async findOrCreateByRemoteUrl(
    rawRemoteUrl: string | null,
    defaults: Omit<RepositoryCreateInput, 'normalizedRemoteUrl'>,
  ): Promise<Repository> {
    const normalizedRemoteUrl =
      rawRemoteUrl === null ? null : normalizeRemoteUrl(rawRemoteUrl);

    if (normalizedRemoteUrl !== null) {
      const existing =
        await this.findByNormalizedRemoteUrl(normalizedRemoteUrl);
      if (existing) return existing;
    }

    return this.create({ ...defaults, normalizedRemoteUrl });
  }

  /**
   * @description Updates fields of a live repository by id. Returns null when not found; the
   * inherited `update` throws instead.
   */
  async updateRepository(
    id: string,
    data: UpdateRepositoryInput,
  ): Promise<Repository | null> {
    const existing = await this.findRepositoryById(id);
    if (!existing) return null;

    if (data.defaultBranch !== undefined) {
      existing.defaultBranch = data.defaultBranch;
    }
    if (data.name !== undefined) {
      existing.name = data.name;
    }
    if (data.normalizedRemoteUrl !== undefined) {
      existing.normalizedRemoteUrl = data.normalizedRemoteUrl;
    }
    if (data.projectId !== undefined) {
      existing.projectId = data.projectId;
    }

    return this.repository.save(existing);
  }

  /**
   * @description Resolves a provisional repository that gained a remote
   * (design doc §4): merge into the existing canonical row when one matches
   * (all checkouts re-point, the provisional row is soft deleted, and the
   * canonical project link wins) or promote the provisional row in place.
   * Only live rows take part. Runs in one transaction with the provisional row locked so
   * concurrent refreshes serialize. Returns null when the repository does not exist.
   */
  async mergeDetectedRemote(
    repositoryId: string,
    normalizedRemoteUrl: string,
  ): Promise<MergeDetectedRemoteResult | null> {
    return this.repository.manager.transaction(async (manager) => {
      const provisional = await manager.findOne(Repository, {
        lock: { mode: 'pessimistic_write' },
        where: { deletedAt: IsNull(), id: repositoryId },
      });
      if (!provisional) return null;
      if (provisional.normalizedRemoteUrl !== null) {
        return {
          merged: false,
          repository: provisional,
          supersededProjectId: null,
        };
      }

      const canonical = await manager.findOne(Repository, {
        where: { deletedAt: IsNull(), normalizedRemoteUrl },
      });
      if (canonical) {
        await manager.update(
          RepositoryCheckout,
          { deletedAt: IsNull(), repositoryId },
          { repositoryId: canonical.id },
        );
        await manager.softDelete(Repository, {
          deletedAt: IsNull(),
          id: repositoryId,
        });
        return {
          merged: true,
          repository: canonical,
          supersededProjectId: provisional.projectId,
        };
      }

      provisional.normalizedRemoteUrl = normalizedRemoteUrl;
      const promoted = await manager.save(provisional);
      return { merged: false, repository: promoted, supersededProjectId: null };
    });
  }

  /**
   * @description Soft deletes a live repository and all of its live checkouts in one
   * transaction. Returns false when no live repository matched.
   */
  async removeRepository(id: string): Promise<boolean> {
    return this.repository.manager.transaction(async (manager) => {
      return this.softDeleteWithCheckouts(manager, id);
    });
  }

  private async softDeleteWithCheckouts(
    manager: EntityManager,
    id: string,
  ): Promise<boolean> {
    const result = await manager.softDelete(Repository, {
      deletedAt: IsNull(),
      id,
    });
    if (!result.affected) return false;

    await manager.softDelete(RepositoryCheckout, {
      deletedAt: IsNull(),
      repositoryId: id,
    });
    return true;
  }
}
